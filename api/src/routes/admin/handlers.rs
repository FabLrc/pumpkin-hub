use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    AdminListParams, AdminPluginEntry, AdminStatsResponse, AdminUserEntry, AuditLogEntry,
    ChangeRoleRequest, PaginatedResponse, PaginationMeta,
};

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct PluginAdminRow {
    id: Uuid,
    name: String,
    slug: String,
    author_username: String,
    downloads_total: i64,
    is_active: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct UserAdminRow {
    id: Uuid,
    username: String,
    display_name: Option<String>,
    email: Option<String>,
    role: String,
    is_active: bool,
    plugin_count: i64,
    created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct AuditLogRow {
    id: Uuid,
    actor_username: String,
    action: String,
    target_type: String,
    target_id: Uuid,
    details: Option<serde_json::Value>,
    created_at: DateTime<Utc>,
}

// ── Audit Logger ────────────────────────────────────────────────────────────

async fn record_audit_log(
    pool: &PgPool,
    actor_id: Uuid,
    action: &str,
    target_type: &str,
    target_id: Uuid,
    details: Option<serde_json::Value>,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(actor_id)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(details)
    .execute(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(())
}

// ── Dashboard Stats ─────────────────────────────────────────────────────────

/// GET /api/v1/admin/stats
pub async fn get_admin_stats(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<AdminStatsResponse>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let total_users: i64 =
        sqlx::query_scalar::<_, Option<i64>>("SELECT COUNT(*) FROM users WHERE is_active = true")
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?
            .unwrap_or(0);

    let plugin_stats: (Option<i64>, Option<i64>, Option<i64>) = sqlx::query_as(
        "SELECT
            COUNT(*) FILTER (WHERE is_active = true),
            COUNT(*) FILTER (WHERE is_active = false),
            COALESCE(SUM(downloads_total), 0)
         FROM plugins",
    )
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    let recent_audit_logs = fetch_audit_logs(pool, 10, 0).await?;

    Ok(Json(AdminStatsResponse {
        total_users,
        total_plugins: plugin_stats.0.unwrap_or(0) + plugin_stats.1.unwrap_or(0),
        active_plugins: plugin_stats.0.unwrap_or(0),
        deactivated_plugins: plugin_stats.1.unwrap_or(0),
        total_downloads: plugin_stats.2.unwrap_or(0),
        recent_audit_logs,
    }))
}

// ── Plugin Moderation ───────────────────────────────────────────────────────

/// GET /api/v1/admin/plugins — list all plugins (including deactivated).
pub async fn list_plugins_admin(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<AdminListParams>,
) -> Result<Json<PaginatedResponse<AdminPluginEntry>>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;
    let search_pattern = params.search.as_deref().map(|s| format!("%{s}%"));

    let total: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE ($1::text IS NULL OR p.name ILIKE $1 OR p.slug ILIKE $1 OR u.username ILIKE $1)",
    )
    .bind(&search_pattern)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?
    .unwrap_or(0);

    let rows: Vec<PluginAdminRow> = sqlx::query_as(
        "SELECT p.id, p.name, p.slug,
                u.username AS author_username,
                p.downloads_total, p.is_active,
                p.created_at, p.updated_at
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE ($1::text IS NULL OR p.name ILIKE $1 OR p.slug ILIKE $1 OR u.username ILIKE $1)
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(&search_pattern)
    .bind(per_page as i64)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let total_pages = calculate_total_pages(total, per_page);
    let data = rows.into_iter().map(|r| AdminPluginEntry {
        id: r.id,
        name: r.name,
        slug: r.slug,
        author_username: r.author_username,
        downloads_total: r.downloads_total,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }).collect();

    Ok(Json(PaginatedResponse {
        data,
        pagination: PaginationMeta { page, per_page, total, total_pages },
    }))
}

/// POST /api/v1/admin/plugins/{plugin_id}/deactivate
pub async fn deactivate_plugin(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let result = sqlx::query("UPDATE plugins SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true")
        .bind(plugin_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    record_audit_log(
        pool,
        auth.user_id,
        "plugin.deactivate",
        "plugin",
        plugin_id,
        None,
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "Plugin deactivated" })))
}

/// POST /api/v1/admin/plugins/{plugin_id}/reactivate
pub async fn reactivate_plugin(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let result = sqlx::query("UPDATE plugins SET is_active = true, updated_at = NOW() WHERE id = $1 AND is_active = false")
        .bind(plugin_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    record_audit_log(
        pool,
        auth.user_id,
        "plugin.reactivate",
        "plugin",
        plugin_id,
        None,
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "Plugin reactivated" })))
}

// ── User Management ─────────────────────────────────────────────────────────

/// GET /api/v1/admin/users — list all users with stats.
pub async fn list_users(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<AdminListParams>,
) -> Result<Json<PaginatedResponse<AdminUserEntry>>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;
    let search_pattern = params.search.as_deref().map(|s| format!("%{s}%"));

    let total: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM users
         WHERE ($1::text IS NULL OR username ILIKE $1 OR email ILIKE $1)",
    )
    .bind(&search_pattern)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?
    .unwrap_or(0);

    let rows: Vec<UserAdminRow> = sqlx::query_as(
        "SELECT u.id, u.username, u.display_name, u.email, u.role, u.is_active,
                u.created_at,
                COALESCE(pc.cnt, 0) AS plugin_count
         FROM users u
         LEFT JOIN (
             SELECT author_id, COUNT(*) AS cnt
             FROM plugins
             WHERE is_active = true
             GROUP BY author_id
         ) pc ON pc.author_id = u.id
         WHERE ($1::text IS NULL OR u.username ILIKE $1 OR u.email ILIKE $1)
         ORDER BY u.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(&search_pattern)
    .bind(per_page as i64)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let total_pages = calculate_total_pages(total, per_page);
    let data = rows.into_iter().map(|r| AdminUserEntry {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        email: r.email,
        role: r.role,
        is_active: r.is_active,
        plugin_count: r.plugin_count,
        created_at: r.created_at,
    }).collect();

    Ok(Json(PaginatedResponse {
        data,
        pagination: PaginationMeta { page, per_page, total, total_pages },
    }))
}

/// PATCH /api/v1/admin/users/{user_id}/role — change a user's role (admin only).
pub async fn change_user_role(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<ChangeRoleRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_admin()?;
    let pool = &state.db;

    body.validate()
        .map_err(|msg| AppError::UnprocessableEntity(msg.to_string()))?;

    // Prevent self-demotion
    if auth.user_id == user_id {
        return Err(AppError::UnprocessableEntity(
            "Cannot change your own role".to_string(),
        ));
    }

    let old_role: Option<String> =
        sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    let old_role = old_role.ok_or(AppError::NotFound)?;

    sqlx::query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2")
        .bind(&body.role)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    record_audit_log(
        pool,
        auth.user_id,
        "user.role_change",
        "user",
        user_id,
        Some(serde_json::json!({
            "old_role": old_role,
            "new_role": body.role,
        })),
    )
    .await?;

    Ok(Json(serde_json::json!({
        "message": "Role updated",
        "role": body.role,
    })))
}

/// POST /api/v1/admin/users/{user_id}/deactivate — ban/deactivate a user.
pub async fn deactivate_user(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_admin()?;
    let pool = &state.db;

    if auth.user_id == user_id {
        return Err(AppError::UnprocessableEntity(
            "Cannot deactivate your own account".to_string(),
        ));
    }

    let result = sqlx::query("UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true")
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    record_audit_log(
        pool,
        auth.user_id,
        "user.deactivate",
        "user",
        user_id,
        None,
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "User deactivated" })))
}

/// POST /api/v1/admin/users/{user_id}/reactivate — reactivate a banned user.
pub async fn reactivate_user(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_admin()?;
    let pool = &state.db;

    let result = sqlx::query("UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1 AND is_active = false")
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    record_audit_log(
        pool,
        auth.user_id,
        "user.reactivate",
        "user",
        user_id,
        None,
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "User reactivated" })))
}

// ── Audit Logs ──────────────────────────────────────────────────────────────

/// GET /api/v1/admin/audit-logs — paginated audit log.
pub async fn list_audit_logs(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<AdminListParams>,
) -> Result<Json<PaginatedResponse<AuditLogEntry>>, AppError> {
    auth.require_staff()?;
    let pool = &state.db;

    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;

    let total: i64 = sqlx::query_scalar::<_, Option<i64>>("SELECT COUNT(*) FROM audit_logs")
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?
        .unwrap_or(0);

    let total_pages = calculate_total_pages(total, per_page);
    let entries = fetch_audit_logs(pool, per_page as i64, offset).await?;

    Ok(Json(PaginatedResponse {
        data: entries,
        pagination: PaginationMeta { page, per_page, total, total_pages },
    }))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async fn fetch_audit_logs(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<Vec<AuditLogEntry>, AppError> {
    let rows: Vec<AuditLogRow> = sqlx::query_as(
        "SELECT a.id, u.username AS actor_username,
                a.action, a.target_type, a.target_id,
                a.details, a.created_at
         FROM audit_logs a
         JOIN users u ON a.actor_id = u.id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(rows
        .into_iter()
        .map(|r| AuditLogEntry {
            id: r.id,
            actor_username: r.actor_username,
            action: r.action,
            target_type: r.target_type,
            target_id: r.target_id,
            details: r.details,
            created_at: r.created_at,
        })
        .collect())
}

fn calculate_total_pages(total: i64, per_page: u32) -> u32 {
    if total == 0 {
        0
    } else {
        ((total as f64) / (per_page as f64)).ceil() as u32
    }
}
