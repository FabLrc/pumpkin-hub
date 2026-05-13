use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::AppError,
    state::AppState,
};

use super::dto::{
    BuildResponse, CreateProjectRequest, NodeRegistryResponse, ProjectDetailResponse,
    ProjectListResponse, ProjectSummary, PublishDataResponse, TriggerBuildResponse,
    UpdateProjectRequest,
};

// ── SQL Row Types ─────────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct ProjectRow {
    id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    status: String,
    pumpkin_version_min: Option<String>,
    pumpkin_version_max: Option<String>,
    latest_build_id: Option<Uuid>,
    build_count: i32,
    published_plugin_id: Option<Uuid>,
    wit_snapshot_hash: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct BuildRow {
    id: Uuid,
    project_id: Uuid,
    build_number: i32,
    status: String,
    logs: Option<String>,
    artifact_storage_key: Option<String>,
    artifact_checksum_sha256: Option<String>,
    artifact_file_size: Option<i64>,
    error_message: Option<String>,
    created_at: DateTime<Utc>,
    started_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow)]
struct ProjectSummaryRow {
    id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    status: String,
    pumpkin_version_min: Option<String>,
    pumpkin_version_max: Option<String>,
    latest_build_id: Option<Uuid>,
    build_count: i32,
    published_plugin_id: Option<Uuid>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
#[allow(dead_code)]
struct PublishedPluginCheck {
    published_plugin_id: Option<Uuid>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROJECT_SELECT_COLUMNS: &str = "id, name, slug, description, status,
            pumpkin_version_min, pumpkin_version_max,
            latest_build_id, build_count, published_plugin_id,
            wit_snapshot_hash, created_at, updated_at";

async fn fetch_project_for_user(
    pool: &sqlx::PgPool,
    project_id: Uuid,
    user_id: Uuid,
) -> Result<Option<ProjectRow>, AppError> {
    let query = format!(
        "SELECT {PROJECT_SELECT_COLUMNS} FROM plugin_projects WHERE id = $1 AND user_id = $2"
    );
    sqlx::query_as(&query)
        .bind(project_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)
}

fn to_summary(row: ProjectSummaryRow) -> ProjectSummary {
    ProjectSummary {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status,
        pumpkin_version_min: row.pumpkin_version_min,
        pumpkin_version_max: row.pumpkin_version_max,
        latest_build_id: row.latest_build_id,
        build_count: row.build_count,
        published_plugin_id: row.published_plugin_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

fn slugify(name: &str) -> String {
    let slug = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
        .collect::<String>();
    slug.trim_matches('-').to_string()
}

async fn generate_unique_slug(pool: &sqlx::PgPool, base: &str) -> Result<String, AppError> {
    let slug = slugify(base);
    let candidate = if slug.is_empty() { "project" } else { &slug };

    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM plugin_projects WHERE slug = $1)",
    )
    .bind(candidate)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    if !exists {
        return Ok(candidate.to_string());
    }

    for i in 1..100 {
        let candidate = format!("{}-{}", slug, i);
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM plugin_projects WHERE slug = $1)",
        )
        .bind(&candidate)
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?;

        if !exists {
            return Ok(candidate);
        }
    }

    Err(AppError::UnprocessableEntity(
        "could not generate a unique slug for this project name".into(),
    ))
}

// ── Node Registry ─────────────────────────────────────────────────────────────

/// `GET /api/v1/studio/nodes`
/// Returns available node definitions from the latest WIT snapshot.
pub async fn get_node_registry(
    State(state): State<AppState>,
) -> Result<Json<NodeRegistryResponse>, AppError> {
    #[derive(FromRow)]
    struct SnapshotRow {
        snapshot_hash: String,
        fetched_at: DateTime<Utc>,
    }

    let snapshot: Option<SnapshotRow> = sqlx::query_as(
        "SELECT snapshot_hash, fetched_at
         FROM node_registry_snapshots
         ORDER BY fetched_at DESC
         LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let (snapshot_hash, fetched_at) = match snapshot {
        Some(s) => (s.snapshot_hash, s.fetched_at),
        None => {
            // No WIT fetched yet; return empty registry.
            return Ok(Json(NodeRegistryResponse {
                nodes: vec![],
                snapshot_hash: "none".into(),
                fetched_at: Utc::now(),
            }));
        }
    };

    #[derive(FromRow)]
    struct NodeRow {
        node_id: String,
        category: String,
        definition: serde_json::Value,
    }

    let rows: Vec<NodeRow> = sqlx::query_as(
        "SELECT node_id, category, definition
         FROM node_registry
         WHERE snapshot_hash = $1
         ORDER BY category, node_id",
    )
    .bind(&snapshot_hash)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    let nodes = rows
        .into_iter()
        .map(|r| {
            // definition is the serialized NodeDefinition from the backend
            serde_json::from_value(r.definition).unwrap_or_else(|_| super::dto::NodeDefinition {
                node_id: r.node_id.clone(),
                category: r.category,
                label: r.node_id,
                color: "#888888".into(),
                description: None,
                parameters: vec![],
                outputs: vec![],
            })
        })
        .collect();

    Ok(Json(NodeRegistryResponse {
        nodes,
        snapshot_hash,
        fetched_at,
    }))
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

/// `GET /api/v1/studio/projects`
pub async fn list_projects(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<ProjectListResponse>, AppError> {
    let rows: Vec<ProjectSummaryRow> = sqlx::query_as(
        "SELECT id, name, slug, description, status,
                pumpkin_version_min, pumpkin_version_max,
                latest_build_id, build_count, published_plugin_id,
                created_at, updated_at
         FROM plugin_projects
         WHERE user_id = $1
         ORDER BY updated_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(ProjectListResponse {
        projects: rows.into_iter().map(to_summary).collect(),
    }))
}

/// `POST /api/v1/studio/projects`
pub async fn create_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ProjectDetailResponse>), AppError> {
    body.validate()?;

    let slug = generate_unique_slug(&state.db, &body.name).await?;

    // Get the latest WIT snapshot hash if available
    let wit_hash: Option<String> = sqlx::query_scalar(
        "SELECT snapshot_hash
         FROM node_registry_snapshots
         ORDER BY fetched_at DESC
         LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let row: ProjectRow = sqlx::query_as(
        "INSERT INTO plugin_projects
            (user_id, name, slug, description, pumpkin_version_min, pumpkin_version_max, wit_snapshot_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, slug, description, status,
                   pumpkin_version_min, pumpkin_version_max,
                   latest_build_id, build_count, published_plugin_id,
                   wit_snapshot_hash, created_at, updated_at",
    )
    .bind(auth.user_id)
    .bind(body.name.trim())
    .bind(&slug)
    .bind(body.description.as_deref().map(str::trim))
    .bind(&body.pumpkin_version_min)
    .bind(&body.pumpkin_version_max)
    .bind(&wit_hash)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    let summary = to_summary(ProjectSummaryRow {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status,
        pumpkin_version_min: row.pumpkin_version_min,
        pumpkin_version_max: row.pumpkin_version_max,
        latest_build_id: row.latest_build_id,
        build_count: row.build_count,
        published_plugin_id: row.published_plugin_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    });

    Ok((
        StatusCode::CREATED,
        Json(ProjectDetailResponse {
            project: summary,
            flow_data: serde_json::json!({"nodes": [], "edges": []}),
            wit_snapshot_hash: row.wit_snapshot_hash,
        }),
    ))
}

/// `GET /api/v1/studio/projects/{id}`
pub async fn get_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ProjectDetailResponse>, AppError> {
    let row: ProjectRow = fetch_project_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    // Fetch flow_data separately (large JSONB)
    let flow_data: serde_json::Value = sqlx::query_scalar(
        "SELECT flow_data FROM plugin_projects WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    let summary = to_summary(ProjectSummaryRow {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status,
        pumpkin_version_min: row.pumpkin_version_min,
        pumpkin_version_max: row.pumpkin_version_max,
        latest_build_id: row.latest_build_id,
        build_count: row.build_count,
        published_plugin_id: row.published_plugin_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    });

    Ok(Json(ProjectDetailResponse {
        project: summary,
        flow_data,
        wit_snapshot_hash: row.wit_snapshot_hash,
    }))
}

/// `PUT /api/v1/studio/projects/{id}`
pub async fn update_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectDetailResponse>, AppError> {
    body.validate()?;

    let row: Option<ProjectRow> = sqlx::query_as(
        "UPDATE plugin_projects
         SET name                  = COALESCE($3, name),
             description           = COALESCE($4, description),
             flow_data             = COALESCE($5, flow_data),
             pumpkin_version_min   = COALESCE($6, pumpkin_version_min),
             pumpkin_version_max   = COALESCE($7, pumpkin_version_max),
             updated_at            = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, slug, description, status,
                   pumpkin_version_min, pumpkin_version_max,
                   latest_build_id, build_count, published_plugin_id,
                   wit_snapshot_hash, created_at, updated_at",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(body.name.as_deref().map(str::trim))
    .bind(body.description.as_deref().map(str::trim))
    .bind(&body.flow_data)
    .bind(&body.pumpkin_version_min)
    .bind(&body.pumpkin_version_max)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let row = row.ok_or(AppError::NotFound)?;

    let flow_data: serde_json::Value = sqlx::query_scalar(
        "SELECT flow_data FROM plugin_projects WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    let summary = to_summary(ProjectSummaryRow {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status,
        pumpkin_version_min: row.pumpkin_version_min,
        pumpkin_version_max: row.pumpkin_version_max,
        latest_build_id: row.latest_build_id,
        build_count: row.build_count,
        published_plugin_id: row.published_plugin_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    });

    Ok(Json(ProjectDetailResponse {
        project: summary,
        flow_data,
        wit_snapshot_hash: row.wit_snapshot_hash,
    }))
}

/// `DELETE /api/v1/studio/projects/{id}`
pub async fn delete_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM plugin_projects WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

// ── Build & Publish ───────────────────────────────────────────────────────────

/// `POST /api/v1/studio/projects/{id}/build`
pub async fn trigger_build(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<TriggerBuildResponse>, AppError> {
    let project: ProjectRow = fetch_project_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    // Validate that the project has at least one node before enqueuing
    let flow_has_nodes = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT flow_data->'nodes' FROM plugin_projects WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)
    .map(|v| v.as_array().map_or(false, |a| !a.is_empty()))
    .unwrap_or(false);

    if !flow_has_nodes {
        return Err(AppError::UnprocessableEntity(
            "cannot build an empty project — add at least one node to the graph".into(),
        ));
    }

    // Increment build counter and create build job
    let new_build_number = project.build_count + 1;

    // Create the build job (artifact fields are null at creation, set by worker)
    let build_id: Uuid = sqlx::query_scalar(
        "INSERT INTO build_jobs (project_id, build_number, status)
         VALUES ($1, $2, 'queued')
         RETURNING id",
    )
    .bind(id)
    .bind(new_build_number)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    // Update project build_count and latest_build_id
    sqlx::query(
        "UPDATE plugin_projects
         SET build_count = $2, latest_build_id = $3, status = 'building', updated_at = now()
         WHERE id = $1",
    )
    .bind(id)
    .bind(new_build_number)
    .bind(build_id)
    .execute(&state.db)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(TriggerBuildResponse {
        build_id,
        status: "queued".into(),
    }))
}

/// `GET /api/v1/studio/builds/{id}`
pub async fn get_build_status(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<BuildResponse>, AppError> {
    let row: Option<BuildRow> = sqlx::query_as(
        "SELECT bj.id, bj.project_id, bj.build_number, bj.status, bj.logs,
                bj.artifact_storage_key, bj.artifact_checksum_sha256,
                bj.artifact_file_size, bj.error_message,
                bj.created_at, bj.started_at, bj.completed_at
         FROM build_jobs bj
         JOIN plugin_projects pp ON pp.id = bj.project_id
         WHERE bj.id = $1 AND pp.user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok(Json(BuildResponse {
        id: row.id,
        project_id: row.project_id,
        build_number: row.build_number,
        status: row.status,
        logs: row.logs,
        artifact_checksum_sha256: row.artifact_checksum_sha256,
        artifact_file_size: row.artifact_file_size,
        error_message: row.error_message,
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
    }))
}

/// `GET /api/v1/studio/projects/{id}/publish-data`
/// Returns metadata + presigned download URL for the latest successful build.
pub async fn get_publish_data(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<PublishDataResponse>, AppError> {
    let project: ProjectRow = fetch_project_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    let latest_build_id = project
        .latest_build_id
        .ok_or_else(|| AppError::UnprocessableEntity("no builds exist for this project".into()))?;

    let build: BuildRow = sqlx::query_as(
        "SELECT id, project_id, build_number, status, logs,
                artifact_storage_key, artifact_checksum_sha256,
                artifact_file_size, error_message,
                created_at, started_at, completed_at
         FROM build_jobs
         WHERE id = $1",
    )
    .bind(latest_build_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    if build.status != "success" {
        return Err(AppError::UnprocessableEntity(format!(
            "latest build status is '{build_status}'; must be 'success'",
            build_status = build.status
        )));
    }

    // Generate download URL for the binary
    let storage_key = build
        .artifact_storage_key
        .as_deref()
        .ok_or_else(|| AppError::UnprocessableEntity("build has no artifact".into()))?;

    let download_url = state
        .storage
        .resolve_url(Some(storage_key))
        .await
        .ok_or_else(|| AppError::UnprocessableEntity("unable to resolve binary URL".into()))?;

    let file_size = build.artifact_file_size.unwrap_or(0);

    Ok(Json(PublishDataResponse {
        project_name: project.name,
        project_slug: project.slug,
        description: project.description,
        build_id: build.id,
        download_url,
        checksum_sha256: build.artifact_checksum_sha256.unwrap_or_default(),
        file_size,
    }))
}

/// `POST /api/v1/studio/projects/{id}/transfer-binary`
/// Transfers the binary from studio-builds prefix to the plugins prefix for publishing.
pub async fn transfer_binary() -> Result<Json<serde_json::Value>, AppError> {
    Err(AppError::UnprocessableEntity(
        "binary transfer not yet implemented (Phase 4)".into(),
    ))
}

// ── Storage extensions for studio ─────────────────────────────────────────────
// ObjectStorage already has: presigned_download_url, resolve_url, public_object_url,
// delete_object, get_object_bytes, head_object_metadata, put_object, put_object_with_metadata.
// Studio will add copy_object in Phase 4 for binary transfer between prefixes.
