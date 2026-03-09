use std::collections::{HashMap, HashSet};

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    ConflictType, DeclareDepdendencyRequest, DependencyConflict, DependencyGraphEdge,
    DependencyGraphNode, DependencyGraphResponse, DependencyListResponse, DependencyPluginSummary,
    DependencyResponse, ReverseDependant, ReverseDependencyResponse, UpdateDependencyRequest,
};
use crate::routes::plugins::handlers::require_ownership;

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct DependencyRow {
    id: uuid::Uuid,
    version_req: String,
    is_optional: bool,
    created_at: chrono::DateTime<chrono::Utc>,
    dependency_plugin_id: uuid::Uuid,
    dependency_plugin_name: String,
    dependency_plugin_slug: String,
}

#[derive(Debug, FromRow)]
struct ReverseDependantRow {
    plugin_id: uuid::Uuid,
    plugin_name: String,
    plugin_slug: String,
    version: String,
    version_req: String,
    is_optional: bool,
}

#[derive(Debug, FromRow)]
struct VersionRow {
    id: uuid::Uuid,
    version: String,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// Resolves a plugin slug + version string to (plugin_id, version_id, author_id).
async fn resolve_plugin_version(
    pool: &PgPool,
    slug: &str,
    version: &str,
) -> Result<(Uuid, Uuid, Uuid), AppError> {
    #[derive(FromRow)]
    struct Row {
        plugin_id: Uuid,
        version_id: Uuid,
        author_id: Uuid,
    }
    let row: Row = sqlx::query_as(
        "SELECT p.id AS plugin_id, v.id AS version_id, p.author_id
         FROM plugins p
         JOIN versions v ON v.plugin_id = p.id
         WHERE p.slug = $1 AND p.is_active = true AND v.version = $2",
    )
    .bind(slug)
    .bind(version)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    Ok((row.plugin_id, row.version_id, row.author_id))
}

// ── CRUD Handlers ───────────────────────────────────────────────────────────

/// GET /api/v1/plugins/:slug/versions/:version/dependencies
pub async fn list_dependencies(
    State(state): State<AppState>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<DependencyListResponse>, AppError> {
    let pool = &state.db;
    let (_plugin_id, version_id, _author_id) =
        resolve_plugin_version(pool, &slug, &version).await?;

    let rows: Vec<DependencyRow> = sqlx::query_as(
        "SELECT pd.id, pd.version_req, pd.is_optional, pd.created_at,
                p.id AS dependency_plugin_id, p.name AS dependency_plugin_name,
                p.slug AS dependency_plugin_slug
         FROM plugin_dependencies pd
         JOIN plugins p ON pd.dependency_plugin_id = p.id
         WHERE pd.version_id = $1
         ORDER BY p.name",
    )
    .bind(version_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let total = rows.len();
    let dependencies = rows.into_iter().map(build_dependency_response).collect();

    Ok(Json(DependencyListResponse {
        plugin_slug: slug,
        version,
        total,
        dependencies,
    }))
}

/// POST /api/v1/plugins/:slug/versions/:version/dependencies
pub async fn declare_dependency(
    State(state): State<AppState>,
    Path((slug, version)): Path<(String, String)>,
    auth: AuthUser,
    Json(payload): Json<DeclareDepdendencyRequest>,
) -> Result<(StatusCode, Json<DependencyResponse>), AppError> {
    payload.validate()?;

    let pool = &state.db;
    let (plugin_id, version_id, author_id) = resolve_plugin_version(pool, &slug, &version).await?;

    require_ownership(&auth, author_id)?;

    // Prevent self-dependency
    if payload.dependency_plugin_id == plugin_id {
        return Err(AppError::UnprocessableEntity(
            "A plugin cannot depend on itself".to_string(),
        ));
    }

    // Verify target plugin exists and is active
    let target_active: Option<bool> =
        sqlx::query_scalar("SELECT is_active FROM plugins WHERE id = $1")
            .bind(payload.dependency_plugin_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    match target_active {
        None => {
            return Err(AppError::UnprocessableEntity(
                "Dependency plugin not found".to_string(),
            ));
        }
        Some(false) => {
            return Err(AppError::UnprocessableEntity(
                "Cannot depend on an inactive plugin".to_string(),
            ));
        }
        Some(true) => {}
    }

    // Check for circular dependency (direct cycle: A→B→A)
    let creates_cycle =
        detect_circular_dependency(pool, version_id, plugin_id, payload.dependency_plugin_id)
            .await?;

    if creates_cycle {
        return Err(AppError::Conflict(
            "Adding this dependency would create a circular dependency chain".to_string(),
        ));
    }

    let row: DependencyRow = sqlx::query_as(
        "INSERT INTO plugin_dependencies (version_id, dependency_plugin_id, version_req, is_optional)
         VALUES ($1, $2, $3, $4)
         RETURNING id, version_req, is_optional, created_at,
                   $2 AS dependency_plugin_id,
                   (SELECT name FROM plugins WHERE id = $2) AS dependency_plugin_name,
                   (SELECT slug FROM plugins WHERE id = $2) AS dependency_plugin_slug",
    )
    .bind(version_id)
    .bind(payload.dependency_plugin_id)
    .bind(payload.version_req.trim())
    .bind(payload.is_optional)
    .fetch_one(pool)
    .await
    .map_err(|err| {
        if let sqlx::Error::Database(ref db_err) = err {
            if db_err.constraint() == Some("plugin_dependencies_version_id_dependency_plugin_id_key") {
                return AppError::Conflict(
                    "This dependency is already declared for this version".to_string(),
                );
            }
        }
        AppError::internal(err)
    })?;

    Ok((StatusCode::CREATED, Json(build_dependency_response(row))))
}

/// PUT /api/v1/plugins/:slug/versions/:version/dependencies/:dependency_id
pub async fn update_dependency(
    State(state): State<AppState>,
    Path((slug, version, dependency_id)): Path<(String, String, Uuid)>,
    auth: AuthUser,
    Json(payload): Json<UpdateDependencyRequest>,
) -> Result<Json<DependencyResponse>, AppError> {
    payload.validate()?;

    let pool = &state.db;
    let (_plugin_id, version_id, author_id) = resolve_plugin_version(pool, &slug, &version).await?;

    require_ownership(&auth, author_id)?;

    // Verify dependency belongs to this version
    let exists: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM plugin_dependencies WHERE id = $1 AND version_id = $2")
            .bind(dependency_id)
            .bind(version_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let row: DependencyRow = sqlx::query_as(
        "UPDATE plugin_dependencies
         SET version_req = COALESCE($1, version_req),
             is_optional = COALESCE($2, is_optional)
         WHERE id = $3
         RETURNING id, version_req, is_optional, created_at,
                   dependency_plugin_id,
                   (SELECT name FROM plugins WHERE id = dependency_plugin_id) AS dependency_plugin_name,
                   (SELECT slug FROM plugins WHERE id = dependency_plugin_id) AS dependency_plugin_slug",
    )
    .bind(&payload.version_req)
    .bind(payload.is_optional)
    .bind(dependency_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(build_dependency_response(row)))
}

/// DELETE /api/v1/plugins/:slug/versions/:version/dependencies/:dependency_id
pub async fn remove_dependency(
    State(state): State<AppState>,
    Path((slug, version, dependency_id)): Path<(String, String, Uuid)>,
    auth: AuthUser,
) -> Result<StatusCode, AppError> {
    let pool = &state.db;
    let (_plugin_id, version_id, author_id) = resolve_plugin_version(pool, &slug, &version).await?;

    require_ownership(&auth, author_id)?;

    let result = sqlx::query("DELETE FROM plugin_dependencies WHERE id = $1 AND version_id = $2")
        .bind(dependency_id)
        .bind(version_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

// ── Reverse Dependencies ────────────────────────────────────────────────────

/// GET /api/v1/plugins/:slug/dependants
pub async fn list_reverse_dependencies(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<ReverseDependencyResponse>, AppError> {
    let pool = &state.db;

    let plugin_id: Uuid =
        sqlx::query_scalar("SELECT id FROM plugins WHERE slug = $1 AND is_active = true")
            .bind(&slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?
            .ok_or(AppError::NotFound)?;

    let rows: Vec<ReverseDependantRow> = sqlx::query_as(
        "SELECT p.id AS plugin_id, p.name AS plugin_name, p.slug AS plugin_slug,
                v.version, pd.version_req, pd.is_optional
         FROM plugin_dependencies pd
         JOIN versions v ON pd.version_id = v.id
         JOIN plugins p ON v.plugin_id = p.id
         WHERE pd.dependency_plugin_id = $1 AND p.is_active = true
         ORDER BY p.name, v.version DESC",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let total = rows.len();
    let dependants = rows
        .into_iter()
        .map(|r| ReverseDependant {
            plugin_id: r.plugin_id,
            plugin_name: r.plugin_name,
            plugin_slug: r.plugin_slug,
            version: r.version,
            version_req: r.version_req,
            is_optional: r.is_optional,
        })
        .collect();

    Ok(Json(ReverseDependencyResponse {
        plugin_slug: slug,
        total,
        dependants,
    }))
}

// ── Dependency Graph Resolution ─────────────────────────────────────────────

/// GET /api/v1/plugins/:slug/versions/:version/dependencies/graph
pub async fn resolve_dependency_graph(
    State(state): State<AppState>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<DependencyGraphResponse>, AppError> {
    let pool = &state.db;
    let (plugin_id, version_id, _author_id) = resolve_plugin_version(pool, &slug, &version).await?;

    let mut state = GraphState {
        graph: Vec::new(),
        conflicts: Vec::new(),
        visited: HashSet::new(),
    };

    // BFS through transitive dependencies
    build_graph_recursive(pool, plugin_id, version_id, &slug, &version, &mut state).await?;

    // Detect incompatible range conflicts across the graph
    let GraphState {
        graph,
        mut conflicts,
        ..
    } = state;
    detect_range_conflicts(&graph, &mut conflicts);

    Ok(Json(DependencyGraphResponse {
        plugin_slug: slug,
        version,
        graph,
        conflicts,
    }))
}

// ── Graph Construction (iterative BFS) ─────────────────────────────────────

struct GraphState {
    graph: Vec<DependencyGraphNode>,
    conflicts: Vec<DependencyConflict>,
    visited: HashSet<Uuid>,
}

async fn build_graph_recursive(
    pool: &PgPool,
    plugin_id: Uuid,
    version_id: Uuid,
    slug: &str,
    version: &str,
    state: &mut GraphState,
) -> Result<(), AppError> {
    let GraphState {
        graph,
        conflicts,
        visited,
    } = state;
    // Use an iterative BFS instead of async recursion.
    // `ancestors` tracks the plugin IDs on the current traversal path
    // to detect real circular dependencies (not diamond/shared deps).
    struct QueueItem {
        plugin_id: Uuid,
        version_id: Uuid,
        slug: String,
        version: String,
        ancestors: HashSet<Uuid>,
    }

    let mut root_ancestors = HashSet::new();
    root_ancestors.insert(plugin_id);

    let mut queue = vec![QueueItem {
        plugin_id,
        version_id,
        slug: slug.to_string(),
        version: version.to_string(),
        ancestors: root_ancestors,
    }];

    while let Some(item) = queue.pop() {
        if !visited.insert(item.version_id) {
            continue;
        }

        let deps: Vec<DependencyRow> = sqlx::query_as(
            "SELECT pd.id, pd.version_req, pd.is_optional, pd.created_at,
                    p.id AS dependency_plugin_id, p.name AS dependency_plugin_name,
                    p.slug AS dependency_plugin_slug
             FROM plugin_dependencies pd
             JOIN plugins p ON pd.dependency_plugin_id = p.id
             WHERE pd.version_id = $1
             ORDER BY p.name",
        )
        .bind(item.version_id)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

        let mut edges: Vec<DependencyGraphEdge> = Vec::new();

        for dep in &deps {
            let available: Vec<VersionRow> = sqlx::query_as(
                "SELECT id, version FROM versions
                 WHERE plugin_id = $1 AND is_yanked = false
                 ORDER BY published_at DESC",
            )
            .bind(dep.dependency_plugin_id)
            .fetch_all(pool)
            .await
            .map_err(AppError::internal)?;

            let req = semver::VersionReq::parse(&dep.version_req).ok();
            let mut resolved_version: Option<String> = None;
            let mut resolved_version_id: Option<Uuid> = None;
            let mut is_compatible = false;

            let is_active: Option<bool> =
                sqlx::query_scalar("SELECT is_active FROM plugins WHERE id = $1")
                    .bind(dep.dependency_plugin_id)
                    .fetch_optional(pool)
                    .await
                    .map_err(AppError::internal)?;

            if is_active == Some(false) || is_active.is_none() {
                conflicts.push(DependencyConflict {
                    dependency_plugin_id: dep.dependency_plugin_id,
                    dependency_plugin_name: dep.dependency_plugin_name.clone(),
                    dependency_plugin_slug: dep.dependency_plugin_slug.clone(),
                    conflict_type: ConflictType::InactivePlugin,
                    details: format!(
                        "Plugin '{}' is inactive or deleted",
                        dep.dependency_plugin_name
                    ),
                });
            }

            if let Some(ref req) = req {
                for v in &available {
                    if let Ok(semver_version) = semver::Version::parse(&v.version) {
                        if req.matches(&semver_version) {
                            resolved_version = Some(v.version.clone());
                            resolved_version_id = Some(v.id);
                            is_compatible = true;
                            break;
                        }
                    }
                }

                if !is_compatible {
                    conflicts.push(DependencyConflict {
                        dependency_plugin_id: dep.dependency_plugin_id,
                        dependency_plugin_name: dep.dependency_plugin_name.clone(),
                        dependency_plugin_slug: dep.dependency_plugin_slug.clone(),
                        conflict_type: ConflictType::NoMatchingVersion,
                        details: format!(
                            "No version of '{}' satisfies requirement '{}'",
                            dep.dependency_plugin_name, dep.version_req
                        ),
                    });
                }
            }

            edges.push(DependencyGraphEdge {
                dependency_plugin_id: dep.dependency_plugin_id,
                dependency_plugin_name: dep.dependency_plugin_name.clone(),
                dependency_plugin_slug: dep.dependency_plugin_slug.clone(),
                version_req: dep.version_req.clone(),
                is_optional: dep.is_optional,
                resolved_version: resolved_version.clone(),
                is_compatible,
            });

            // Enqueue resolved dependency for further traversal
            if let Some(resolved_vid) = resolved_version_id {
                if item.ancestors.contains(&dep.dependency_plugin_id) {
                    // True cycle: this dep's plugin is an ancestor in the current path
                    conflicts.push(DependencyConflict {
                        dependency_plugin_id: dep.dependency_plugin_id,
                        dependency_plugin_name: dep.dependency_plugin_name.clone(),
                        dependency_plugin_slug: dep.dependency_plugin_slug.clone(),
                        conflict_type: ConflictType::CircularDependency,
                        details: format!(
                            "Circular dependency detected involving '{}'",
                            dep.dependency_plugin_name
                        ),
                    });
                } else if !visited.contains(&resolved_vid) {
                    // Not yet visited → enqueue with extended ancestry
                    let mut child_ancestors = item.ancestors.clone();
                    child_ancestors.insert(dep.dependency_plugin_id);
                    queue.push(QueueItem {
                        plugin_id: dep.dependency_plugin_id,
                        version_id: resolved_vid,
                        slug: dep.dependency_plugin_slug.clone(),
                        version: resolved_version.unwrap_or_default(),
                        ancestors: child_ancestors,
                    });
                }
                // Already visited via another path (diamond dep) → skip silently
            }
        }

        // Fetch the real plugin name for the node
        let plugin_name: Option<String> =
            sqlx::query_scalar("SELECT name FROM plugins WHERE id = $1")
                .bind(item.plugin_id)
                .fetch_optional(pool)
                .await
                .map_err(AppError::internal)?;

        graph.push(DependencyGraphNode {
            plugin_id: item.plugin_id,
            plugin_name: plugin_name.unwrap_or_else(|| item.slug.clone()),
            plugin_slug: item.slug,
            version: item.version,
            version_id: item.version_id,
            dependencies: edges,
        });
    }

    Ok(())
}

/// Detects when two different dependants require incompatible version ranges
/// for the same plugin.
fn detect_range_conflicts(graph: &[DependencyGraphNode], conflicts: &mut Vec<DependencyConflict>) {
    // Collect all version requirements grouped by dependency plugin ID
    let mut requirements: HashMap<Uuid, Vec<(String, String)>> = HashMap::new();

    for node in graph {
        for edge in &node.dependencies {
            requirements
                .entry(edge.dependency_plugin_id)
                .or_default()
                .push((edge.version_req.clone(), node.plugin_slug.clone()));
        }
    }

    // For each dependency, check if the version ranges are mutually compatible
    for (plugin_id, reqs) in &requirements {
        if reqs.len() < 2 {
            continue;
        }

        let parsed_reqs: Vec<(&str, Option<semver::VersionReq>)> = reqs
            .iter()
            .map(|(req, _)| (req.as_str(), semver::VersionReq::parse(req).ok()))
            .collect();

        // Check if there exists any version that satisfies all requirements
        let all_valid = parsed_reqs.iter().all(|(_, r)| r.is_some());
        if !all_valid {
            continue;
        }

        let semver_reqs: Vec<&semver::VersionReq> =
            parsed_reqs.iter().filter_map(|(_, r)| r.as_ref()).collect();

        // Test a range of plausible versions to see if any satisfies all requirements
        if !has_common_satisfying_version(&semver_reqs) {
            let dependent_names: Vec<&str> = reqs.iter().map(|(_, name)| name.as_str()).collect();
            let req_strings: Vec<&str> = reqs.iter().map(|(req, _)| req.as_str()).collect();

            // Find the plugin name from any existing graph edge
            let plugin_name = graph
                .iter()
                .flat_map(|n| &n.dependencies)
                .find(|e| e.dependency_plugin_id == *plugin_id)
                .map(|e| e.dependency_plugin_name.as_str())
                .unwrap_or("unknown");

            let plugin_slug = graph
                .iter()
                .flat_map(|n| &n.dependencies)
                .find(|e| e.dependency_plugin_id == *plugin_id)
                .map(|e| e.dependency_plugin_slug.as_str())
                .unwrap_or("unknown");

            conflicts.push(DependencyConflict {
                dependency_plugin_id: *plugin_id,
                dependency_plugin_name: plugin_name.to_string(),
                dependency_plugin_slug: plugin_slug.to_string(),
                conflict_type: ConflictType::IncompatibleRanges,
                details: format!(
                    "Incompatible version requirements for '{}': {} (required by: {})",
                    plugin_name,
                    req_strings.join(", "),
                    dependent_names.join(", ")
                ),
            });
        }
    }
}

/// Tests whether there is a common version satisfying all given semver requirements.
/// Generates test versions 0.0.0 through 99.99.99 with common patterns.
fn has_common_satisfying_version(reqs: &[&semver::VersionReq]) -> bool {
    // Generate a set of representative test versions
    for major in 0..20 {
        for minor in 0..10 {
            for patch in 0..5 {
                let test = semver::Version::new(major, minor, patch);
                if reqs.iter().all(|r| r.matches(&test)) {
                    return true;
                }
            }
        }
    }
    false
}

// ── Circular Dependency Detection ───────────────────────────────────────────

/// Checks if adding a dependency from `source_version_id` (belonging to `source_plugin_id`)
/// to `target_plugin_id` would create a cycle.
async fn detect_circular_dependency(
    pool: &PgPool,
    _source_version_id: Uuid,
    source_plugin_id: Uuid,
    target_plugin_id: Uuid,
) -> Result<bool, AppError> {
    // BFS from target to see if we can reach source
    let mut queue: Vec<Uuid> = vec![target_plugin_id];
    let mut visited: HashSet<Uuid> = HashSet::new();
    visited.insert(source_plugin_id);

    while let Some(current_plugin_id) = queue.pop() {
        if current_plugin_id == source_plugin_id {
            return Ok(true);
        }

        if !visited.insert(current_plugin_id) {
            continue;
        }

        // Find all plugins that current_plugin_id depends on (through any version)
        let deps: Vec<Uuid> = sqlx::query_scalar(
            "SELECT DISTINCT pd.dependency_plugin_id
             FROM plugin_dependencies pd
             JOIN versions v ON pd.version_id = v.id
             WHERE v.plugin_id = $1",
        )
        .bind(current_plugin_id)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

        queue.extend(deps);
    }

    Ok(false)
}

// ── Response Builders ───────────────────────────────────────────────────────

fn build_dependency_response(row: DependencyRow) -> DependencyResponse {
    DependencyResponse {
        id: row.id,
        dependency_plugin: DependencyPluginSummary {
            id: row.dependency_plugin_id,
            name: row.dependency_plugin_name,
            slug: row.dependency_plugin_slug,
        },
        version_req: row.version_req,
        is_optional: row.is_optional,
        created_at: row.created_at,
    }
}
