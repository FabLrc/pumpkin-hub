use std::collections::{HashSet, VecDeque};

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::AppError,
    state::AppState,
    storage::{pumpkin_binary::PumpkinBinaryCache, ObjectStorage},
};

use super::dto::{
    CreateServerConfigRequest, DownloadPreviewRequest, PluginSelection, ServerConfigListResponse,
    ServerConfigPluginEntry, ServerConfigResponse, ServerConfigSummary, UpdateServerConfigRequest,
    ValidateConfigResponse,
};

// ── SQL Row Types ─────────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct ServerConfigRow {
    id: Uuid,
    name: String,
    platform: String,
    share_token: Uuid,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct ServerConfigPluginRow {
    plugin_id: Uuid,
    plugin_name: String,
    plugin_slug: String,
    version_id: Uuid,
    version: String,
    is_auto_dep: bool,
}

#[derive(Debug, FromRow)]
struct ServerConfigSummaryRow {
    id: Uuid,
    name: String,
    platform: String,
    share_token: Uuid,
    plugin_count: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/// Loads the plugin entries for a given configuration.
pub(crate) async fn load_config_plugins(
    pool: &PgPool,
    config_id: Uuid,
) -> Result<Vec<ServerConfigPluginEntry>, AppError> {
    let rows: Vec<ServerConfigPluginRow> = sqlx::query_as(
        "SELECT scp.plugin_id,
                p.name  AS plugin_name,
                p.slug  AS plugin_slug,
                scp.version_id,
                v.version,
                scp.is_auto_dep
         FROM server_config_plugins scp
         JOIN plugins  p ON p.id = scp.plugin_id
         JOIN versions v ON v.id = scp.version_id
         WHERE scp.config_id = $1
         ORDER BY scp.is_auto_dep ASC, scp.created_at ASC",
    )
    .bind(config_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(rows
        .into_iter()
        .map(|r| ServerConfigPluginEntry {
            plugin_id: r.plugin_id,
            plugin_name: r.plugin_name,
            plugin_slug: r.plugin_slug,
            version_id: r.version_id,
            version: r.version,
            is_auto_dep: r.is_auto_dep,
        })
        .collect())
}

/// Loads the full `ServerConfigResponse` for a config that is known to exist.
async fn load_full_config(
    pool: &PgPool,
    config_id: Uuid,
) -> Result<ServerConfigResponse, AppError> {
    let row: ServerConfigRow = sqlx::query_as(
        "SELECT id, name, platform, share_token, created_at, updated_at
         FROM server_configs WHERE id = $1",
    )
    .bind(config_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    let plugins = load_config_plugins(pool, config_id).await?;

    Ok(ServerConfigResponse {
        id: row.id,
        name: row.name,
        platform: row.platform,
        share_token: row.share_token,
        plugins,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

/// Validates that every (plugin_id, version_id) pair:
/// - belongs to an active plugin and a non-yanked version
/// - has at least one .wasm binary
///
/// Returns a 422 listing any plugins that are missing a binary.
pub(crate) async fn validate_selections(
    pool: &PgPool,
    selections: &[PluginSelection],
) -> Result<(), AppError> {
    let mut missing_binary: Vec<String> = Vec::new();

    for sel in selections {
        #[derive(FromRow)]
        struct PluginVersionCheck {
            plugin_name: String,
            has_binary: bool,
        }

        let row: Option<PluginVersionCheck> = sqlx::query_as(
            "SELECT p.name AS plugin_name,
                    EXISTS(
                        SELECT 1 FROM binaries b WHERE b.version_id = v.id
                    ) AS has_binary
             FROM plugins p
             JOIN versions v ON v.plugin_id = p.id
             WHERE p.id = $1
               AND v.id = $2
               AND p.is_active   = true
               AND v.is_yanked   = false",
        )
        .bind(sel.plugin_id)
        .bind(sel.version_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?;

        match row {
            None => {
                return Err(AppError::UnprocessableEntity(format!(
                    "plugin_id={} version_id={} not found or unavailable",
                    sel.plugin_id, sel.version_id
                )));
            }
            Some(r) if !r.has_binary => {
                missing_binary.push(r.plugin_name);
            }
            _ => {}
        }
    }

    if !missing_binary.is_empty() {
        return Err(AppError::UnprocessableEntity(format!(
            "the following plugins have no .wasm binary: {}",
            missing_binary.join(", ")
        )));
    }

    Ok(())
}

/// Inserts `server_config_plugins` rows for the given selections.
pub(crate) async fn insert_config_plugins(
    pool: &PgPool,
    config_id: Uuid,
    selections: &[PluginSelection],
    is_auto_dep: bool,
) -> Result<(), AppError> {
    for sel in selections {
        sqlx::query(
            "INSERT INTO server_config_plugins
                 (config_id, plugin_id, version_id, is_auto_dep)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (config_id, plugin_id) DO NOTHING",
        )
        .bind(config_id)
        .bind(sel.plugin_id)
        .bind(sel.version_id)
        .bind(is_auto_dep)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;
    }
    Ok(())
}

// ── Dependency Resolution ─────────────────────────────────────────────────────

/// BFS over `plugin_dependencies WHERE is_optional = false`, starting from the
/// version IDs in `user_selections`.
///
/// Returns only the *newly discovered* required-dependency (plugin_id, version_id)
/// pairs — the caller's selections are excluded from the result.
///
/// Errors (422) if:
///   - a required dependency's plugin is inactive
///   - no non-yanked version satisfies the semver requirement
///   - the resolved version has no `.wasm` binary
pub(crate) async fn resolve_required_plugins(
    pool: &PgPool,
    user_selections: &[PluginSelection],
) -> Result<Vec<PluginSelection>, AppError> {
    // Plugin IDs already covered — prevents duplicating user-selected plugins
    // or revisiting a plugin already resolved in a previous BFS step.
    let mut covered: HashSet<Uuid> = user_selections.iter().map(|s| s.plugin_id).collect();

    // Seed the queue with the version IDs of user-selected plugins.
    let mut queue: VecDeque<Uuid> = user_selections.iter().map(|s| s.version_id).collect();

    let mut auto_deps: Vec<PluginSelection> = Vec::new();
    let mut missing_binary: Vec<String> = Vec::new();

    while let Some(version_id) = queue.pop_front() {
        #[derive(FromRow)]
        struct DepRow {
            dependency_plugin_id: Uuid,
            dependency_plugin_name: String,
            is_active: bool,
            version_req: String,
        }

        let deps: Vec<DepRow> = sqlx::query_as(
            "SELECT pd.dependency_plugin_id,
                    p.name   AS dependency_plugin_name,
                    p.is_active,
                    pd.version_req
             FROM plugin_dependencies pd
             JOIN plugins p ON p.id = pd.dependency_plugin_id
             WHERE pd.version_id = $1 AND pd.is_optional = false",
        )
        .bind(version_id)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

        for dep in deps {
            // Skip plugins already covered by the user's selections or a previous BFS step.
            if covered.contains(&dep.dependency_plugin_id) {
                continue;
            }
            covered.insert(dep.dependency_plugin_id);

            if !dep.is_active {
                return Err(AppError::UnprocessableEntity(format!(
                    "required dependency '{}' is no longer active",
                    dep.dependency_plugin_name
                )));
            }

            // Fetch all non-yanked versions ordered newest-first.
            #[derive(FromRow)]
            struct VerRow {
                id: Uuid,
                version: String,
            }

            let available: Vec<VerRow> = sqlx::query_as(
                "SELECT id, version FROM versions
                 WHERE plugin_id = $1 AND is_yanked = false
                 ORDER BY published_at DESC",
            )
            .bind(dep.dependency_plugin_id)
            .fetch_all(pool)
            .await
            .map_err(AppError::internal)?;

            // Pick the newest version that satisfies the semver requirement.
            // Falls back to the absolute newest if the requirement string is not valid semver.
            let resolved = if let Ok(req) = semver::VersionReq::parse(&dep.version_req) {
                available.iter().find(|v| {
                    semver::Version::parse(&v.version)
                        .map(|sv| req.matches(&sv))
                        .unwrap_or(false)
                })
            } else {
                available.first()
            };

            let resolved = resolved.ok_or_else(|| {
                AppError::UnprocessableEntity(format!(
                    "no version of '{}' satisfies requirement '{}'",
                    dep.dependency_plugin_name, dep.version_req
                ))
            })?;

            let resolved_version_id = resolved.id;

            // Verify the resolved version has a .wasm binary.
            let has_binary: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM binaries WHERE version_id = $1)",
            )
            .bind(resolved_version_id)
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?;

            if has_binary {
                // Enqueue so we also resolve *its* required deps transitively.
                queue.push_back(resolved_version_id);
                auto_deps.push(PluginSelection {
                    plugin_id: dep.dependency_plugin_id,
                    version_id: resolved_version_id,
                });
            } else {
                missing_binary.push(dep.dependency_plugin_name.clone());
            }
        }
    }

    if !missing_binary.is_empty() {
        return Err(AppError::UnprocessableEntity(format!(
            "required dependencies have no .wasm binary: {}",
            missing_binary.join(", ")
        )));
    }

    Ok(auto_deps)
}

// ── CRUD Handlers ─────────────────────────────────────────────────────────────

/// `POST /api/v1/server-configs`
pub async fn create_server_config(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateServerConfigRequest>,
) -> Result<(StatusCode, Json<ServerConfigResponse>), AppError> {
    body.validate()?;

    // Enforce per-user limit
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM server_configs WHERE user_id = $1")
            .bind(auth.user_id)
            .fetch_one(&state.db)
            .await
            .map_err(AppError::internal)?;

    if count >= super::dto::max_configs_per_user() {
        return Err(AppError::UnprocessableEntity(format!(
            "you have reached the maximum of {} saved configurations",
            super::dto::max_configs_per_user()
        )));
    }

    validate_selections(&state.db, &body.plugins).await?;
    let auto_deps = resolve_required_plugins(&state.db, &body.plugins).await?;

    let config: ServerConfigRow = sqlx::query_as(
        "INSERT INTO server_configs (user_id, name, platform)
         VALUES ($1, $2, $3)
         RETURNING id, name, platform, share_token, created_at, updated_at",
    )
    .bind(auth.user_id)
    .bind(body.name.trim())
    .bind(&body.platform)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    // Insert user-selected plugins (is_auto_dep = false).
    insert_config_plugins(&state.db, config.id, &body.plugins, false).await?;

    // Insert BFS-resolved required dependencies (is_auto_dep = true).
    insert_config_plugins(&state.db, config.id, &auto_deps, true).await?;

    let response = load_full_config(&state.db, config.id).await?;
    Ok((StatusCode::CREATED, Json(response)))
}

/// `GET /api/v1/server-configs`
pub async fn list_server_configs(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<ServerConfigListResponse>, AppError> {
    let rows: Vec<ServerConfigSummaryRow> = sqlx::query_as(
        "SELECT sc.id,
                sc.name,
                sc.platform,
                sc.share_token,
                COUNT(scp.id) AS plugin_count,
                sc.created_at,
                sc.updated_at
         FROM server_configs sc
         LEFT JOIN server_config_plugins scp ON scp.config_id = sc.id
         WHERE sc.user_id = $1
         GROUP BY sc.id
         ORDER BY sc.updated_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    let configs = rows
        .into_iter()
        .map(|r| ServerConfigSummary {
            id: r.id,
            name: r.name,
            platform: r.platform,
            share_token: r.share_token,
            plugin_count: r.plugin_count,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();

    Ok(Json(ServerConfigListResponse { configs }))
}

/// `GET /api/v1/server-configs/{id}` — owner only (returns 404 for others)
pub async fn get_server_config(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ServerConfigResponse>, AppError> {
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM server_configs WHERE id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    if !exists {
        return Err(AppError::NotFound);
    }

    Ok(Json(load_full_config(&state.db, id).await?))
}

/// `PUT /api/v1/server-configs/{id}`
pub async fn update_server_config(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateServerConfigRequest>,
) -> Result<Json<ServerConfigResponse>, AppError> {
    body.validate()?;

    // Verify ownership (404 for missing or not owned)
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM server_configs WHERE id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    if !exists {
        return Err(AppError::NotFound);
    }

    // Update scalar fields if provided
    if body.name.is_some() || body.platform.is_some() {
        sqlx::query(
            "UPDATE server_configs
             SET name      = COALESCE($2, name),
                 platform  = COALESCE($3, platform),
                 updated_at = now()
             WHERE id = $1",
        )
        .bind(id)
        .bind(body.name.as_deref().map(str::trim))
        .bind(body.platform.as_deref())
        .execute(&state.db)
        .await
        .map_err(AppError::internal)?;
    }

    // Replace plugin list if provided
    if let Some(ref plugins) = body.plugins {
        validate_selections(&state.db, plugins).await?;
        let auto_deps = resolve_required_plugins(&state.db, plugins).await?;

        let mut tx = state.db.begin().await.map_err(AppError::internal)?;

        sqlx::query("DELETE FROM server_config_plugins WHERE config_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(AppError::internal)?;

        // Re-insert user-selected plugins.
        for sel in plugins {
            sqlx::query(
                "INSERT INTO server_config_plugins
                     (config_id, plugin_id, version_id, is_auto_dep)
                 VALUES ($1, $2, $3, false)",
            )
            .bind(id)
            .bind(sel.plugin_id)
            .bind(sel.version_id)
            .execute(&mut *tx)
            .await
            .map_err(AppError::internal)?;
        }

        // Insert BFS-resolved required dependencies.
        for sel in &auto_deps {
            sqlx::query(
                "INSERT INTO server_config_plugins
                     (config_id, plugin_id, version_id, is_auto_dep)
                 VALUES ($1, $2, $3, true)",
            )
            .bind(id)
            .bind(sel.plugin_id)
            .bind(sel.version_id)
            .execute(&mut *tx)
            .await
            .map_err(AppError::internal)?;
        }

        sqlx::query("UPDATE server_configs SET updated_at = now() WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(AppError::internal)?;

        tx.commit().await.map_err(AppError::internal)?;
    }

    Ok(Json(load_full_config(&state.db, id).await?))
}

/// `DELETE /api/v1/server-configs/{id}`
pub async fn delete_server_config(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let result =
        sqlx::query("DELETE FROM server_configs WHERE id = $1 AND user_id = $2")
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

/// `GET /api/v1/server-configs/share/{token}` — public, no auth required
pub async fn get_by_share_token(
    State(state): State<AppState>,
    Path(token): Path<Uuid>,
) -> Result<Json<ServerConfigResponse>, AppError> {
    let row: Option<ServerConfigRow> = sqlx::query_as(
        "SELECT id, name, platform, share_token, created_at, updated_at
         FROM server_configs WHERE share_token = $1",
    )
    .bind(token)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let row = row.ok_or(AppError::NotFound)?;
    let plugins = load_config_plugins(&state.db, row.id).await?;

    Ok(Json(ServerConfigResponse {
        id: row.id,
        name: row.name,
        platform: row.platform,
        share_token: row.share_token,
        plugins,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))
}

/// `POST /api/v1/server-configs/{id}/rotate-share-token`
pub async fn rotate_share_token(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ServerConfigResponse>, AppError> {
    let row: Option<ServerConfigRow> = sqlx::query_as(
        "UPDATE server_configs
         SET share_token = gen_random_uuid(),
             updated_at  = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, platform, share_token, created_at, updated_at",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let row = row.ok_or(AppError::NotFound)?;
    let plugins = load_config_plugins(&state.db, row.id).await?;

    Ok(Json(ServerConfigResponse {
        id: row.id,
        name: row.name,
        platform: row.platform,
        share_token: row.share_token,
        plugins,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))
}

// ── ZIP Generation ────────────────────────────────────────────────────────────

/// Internal binary info needed to assemble the ZIP (one entry per plugin).
struct ZipPlugin {
    plugin_id: Uuid,
    version_id: Uuid,
    file_name: String,
    storage_key: String,
}

/// Queries `file_name` and `storage_key` from the `binaries` table for each
/// `PluginSelection`. Assumes selections have already been validated.
async fn load_plugins_for_zip(
    pool: &PgPool,
    selections: &[PluginSelection],
) -> Result<Vec<ZipPlugin>, AppError> {
    let mut plugins = Vec::with_capacity(selections.len());
    for sel in selections {
        #[derive(FromRow)]
        struct BinRow {
            file_name: String,
            storage_key: String,
        }

        let row: BinRow = sqlx::query_as(
            "SELECT b.file_name, b.storage_key FROM binaries b WHERE b.version_id = $1",
        )
        .bind(sel.version_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?
        .ok_or(AppError::NotFound)?;

        plugins.push(ZipPlugin {
            plugin_id: sel.plugin_id,
            version_id: sel.version_id,
            file_name: row.file_name,
            storage_key: row.storage_key,
        });
    }
    Ok(plugins)
}

/// Assembles a ZIP archive in memory:
/// - `pumpkin-server[.exe]` at the root — `Stored` (native binary, already compiled)
/// - `plugins/{file_name}` for each plugin — `Deflated` (.wasm compresses well)
///
/// Fetches the Pumpkin nightly binary and all plugin .wasm files concurrently.
async fn generate_zip(
    plugins: Vec<ZipPlugin>,
    platform: &str,
    storage: &ObjectStorage,
    pumpkin_cache: &PumpkinBinaryCache,
    github_token: Option<&str>,
) -> Result<Vec<u8>, AppError> {
    use std::io::Write as _;
    use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

    // Kick off the Pumpkin binary fetch and all S3 plugin fetches concurrently.
    let pumpkin_fut = pumpkin_cache.get_or_fetch(platform, storage, github_token);
    let plugin_futs: Vec<_> = plugins
        .iter()
        .map(|p| storage.get_object_bytes(&p.storage_key))
        .collect();

    let (pumpkin_bytes, plugin_bytes_list) =
        tokio::try_join!(pumpkin_fut, futures::future::try_join_all(plugin_futs))?;

    // Build the archive.
    let cursor = std::io::Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(cursor);

    let exe_name = if platform == "windows" {
        "pumpkin-server.exe"
    } else {
        "pumpkin-server"
    };

    zip.start_file(
        exe_name,
        SimpleFileOptions::default().compression_method(CompressionMethod::Stored),
    )
    .map_err(AppError::internal)?;
    zip.write_all(&pumpkin_bytes).map_err(AppError::internal)?;

    let deflated = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    for (plugin, bytes) in plugins.iter().zip(plugin_bytes_list.iter()) {
        zip.start_file(format!("plugins/{}", plugin.file_name), deflated)
            .map_err(AppError::internal)?;
        zip.write_all(bytes).map_err(AppError::internal)?;
    }

    let cursor = zip.finish().map_err(AppError::internal)?;
    Ok(cursor.into_inner())
}

/// Fire-and-forget: increments download counters and inserts `download_events`
/// for every plugin included in a generated ZIP.
async fn record_downloads(pool: PgPool, plugins: Vec<(Uuid, Uuid)>) {
    for (plugin_id, version_id) in plugins {
        let _ = sqlx::query("UPDATE versions SET downloads = downloads + 1 WHERE id = $1")
            .bind(version_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query(
            "UPDATE plugins SET downloads_total = downloads_total + 1 WHERE id = $1",
        )
        .bind(plugin_id)
        .execute(&pool)
        .await;
        let _ =
            sqlx::query("INSERT INTO download_events (plugin_id, version_id) VALUES ($1, $2)")
                .bind(plugin_id)
                .bind(version_id)
                .execute(&pool)
                .await;
    }
}

/// Builds the `application/zip` HTTP response with `Content-Disposition` header.
fn zip_response(zip_bytes: Vec<u8>, platform: &str) -> Result<axum::response::Response, AppError> {
    use axum::body::Body;
    use axum::http::{header, Response};

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/zip")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"pumpkin-server-{platform}.zip\""),
        )
        .body(Body::from(zip_bytes))
        .map_err(AppError::internal)
}

/// Queries display info (name, slug, version string) for a list of plugin selections
/// and returns `ServerConfigPluginEntry` rows labelled with the given `is_auto_dep` flag.
/// Used by `validate_config` to build a response without a saved config in the DB.
async fn build_plugin_entries(
    pool: &PgPool,
    selections: &[PluginSelection],
    is_auto_dep: bool,
) -> Result<Vec<ServerConfigPluginEntry>, AppError> {
    let mut entries = Vec::with_capacity(selections.len());
    for sel in selections {
        #[derive(FromRow)]
        struct Row {
            plugin_name: String,
            plugin_slug: String,
            version: String,
        }

        let row: Option<Row> = sqlx::query_as(
            "SELECT p.name AS plugin_name, p.slug AS plugin_slug, v.version
             FROM plugins p
             JOIN versions v ON v.plugin_id = p.id AND v.id = $2
             WHERE p.id = $1",
        )
        .bind(sel.plugin_id)
        .bind(sel.version_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?;

        if let Some(r) = row {
            entries.push(ServerConfigPluginEntry {
                plugin_id: sel.plugin_id,
                plugin_name: r.plugin_name,
                plugin_slug: r.plugin_slug,
                version_id: sel.version_id,
                version: r.version,
                is_auto_dep,
            });
        }
    }
    Ok(entries)
}

// ── Download Handlers ─────────────────────────────────────────────────────────

/// `POST /api/v1/server-configs/{id}/download`
/// Generates a ZIP from a saved config (re-resolves required deps fresh).
pub async fn download_server_config(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<axum::response::Response, AppError> {
    let config: Option<ServerConfigRow> = sqlx::query_as(
        "SELECT id, name, platform, share_token, created_at, updated_at
         FROM server_configs WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    let config = config.ok_or(AppError::NotFound)?;

    // Load only the user-selected plugins (is_auto_dep = false) and re-resolve
    // required deps on every download so the ZIP always reflects the latest
    // compatible versions of transitive dependencies.
    #[derive(FromRow)]
    struct SelectionRow {
        plugin_id: Uuid,
        version_id: Uuid,
    }

    let rows: Vec<SelectionRow> = sqlx::query_as(
        "SELECT plugin_id, version_id FROM server_config_plugins
         WHERE config_id = $1 AND is_auto_dep = false",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    let user_selections: Vec<PluginSelection> = rows
        .into_iter()
        .map(|r| PluginSelection {
            plugin_id: r.plugin_id,
            version_id: r.version_id,
        })
        .collect();

    let auto_deps = resolve_required_plugins(&state.db, &user_selections).await?;
    let all_selections: Vec<PluginSelection> =
        user_selections.into_iter().chain(auto_deps).collect();

    let zip_plugins = load_plugins_for_zip(&state.db, &all_selections).await?;
    let analytics: Vec<(Uuid, Uuid)> = zip_plugins
        .iter()
        .map(|p| (p.plugin_id, p.version_id))
        .collect();

    let github_token = state.config.github_api_token.as_deref();
    let zip_bytes = generate_zip(
        zip_plugins,
        &config.platform,
        &state.storage,
        &state.pumpkin_binary_cache,
        github_token,
    )
    .await?;

    tokio::spawn(record_downloads(state.db.clone(), analytics));

    zip_response(zip_bytes, &config.platform)
}

/// `POST /api/v1/server-configs/download-preview`
/// Generates an ephemeral ZIP without saving a configuration.
pub async fn download_preview(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<DownloadPreviewRequest>,
) -> Result<axum::response::Response, AppError> {
    body.validate()?;
    validate_selections(&state.db, &body.plugins).await?;
    let auto_deps = resolve_required_plugins(&state.db, &body.plugins).await?;

    let DownloadPreviewRequest { platform, plugins } = body;
    let all_selections: Vec<PluginSelection> = plugins.into_iter().chain(auto_deps).collect();

    let zip_plugins = load_plugins_for_zip(&state.db, &all_selections).await?;
    let analytics: Vec<(Uuid, Uuid)> = zip_plugins
        .iter()
        .map(|p| (p.plugin_id, p.version_id))
        .collect();

    let github_token = state.config.github_api_token.as_deref();
    let zip_bytes = generate_zip(
        zip_plugins,
        &platform,
        &state.storage,
        &state.pumpkin_binary_cache,
        github_token,
    )
    .await?;

    tokio::spawn(record_downloads(state.db.clone(), analytics));

    zip_response(zip_bytes, &platform)
}

/// `POST /api/v1/server-configs/validate`
/// Validates a plugin selection and returns the fully resolved list (user plugins + auto-deps).
/// Does not generate a ZIP or touch the Pumpkin binary cache.
pub async fn validate_config(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<DownloadPreviewRequest>,
) -> Result<Json<ValidateConfigResponse>, AppError> {
    body.validate()?;
    validate_selections(&state.db, &body.plugins).await?;
    let auto_deps = resolve_required_plugins(&state.db, &body.plugins).await?;

    let DownloadPreviewRequest {
        platform,
        plugins: user_plugins,
    } = body;

    let user_entries = build_plugin_entries(&state.db, &user_plugins, false).await?;
    let auto_entries = build_plugin_entries(&state.db, &auto_deps, true).await?;
    let plugins: Vec<ServerConfigPluginEntry> =
        user_entries.into_iter().chain(auto_entries).collect();

    Ok(Json(ValidateConfigResponse { platform, plugins }))
}
