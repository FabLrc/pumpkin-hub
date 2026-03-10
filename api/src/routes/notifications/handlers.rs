use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    NotificationListParams, NotificationListResponse, NotificationResponse, UnreadCountResponse,
};

// ── GET /notifications ────────────────────────────────────────────────────

pub async fn list_notifications(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<NotificationListParams>,
) -> Result<Json<NotificationListResponse>, AppError> {
    auth.require_permission("read")?;
    let pool = &state.db;
    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    let (notifications, total, unread) = if params.unread_only() {
        let rows = sqlx::query_as::<_, NotificationResponse>(
            "SELECT id, kind, title, body, link, is_read, created_at
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3",
        )
        .bind(auth.user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

        let (total,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        )
        .bind(auth.user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?;

        let unread = total;
        (rows, total, unread)
    } else {
        let rows = sqlx::query_as::<_, NotificationResponse>(
            "SELECT id, kind, title, body, link, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3",
        )
        .bind(auth.user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

        let (total,): (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM notifications WHERE user_id = $1")
                .bind(auth.user_id)
                .fetch_one(pool)
                .await
                .map_err(AppError::internal)?;

        let (unread,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        )
        .bind(auth.user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?;

        (rows, total, unread)
    };

    Ok(Json(NotificationListResponse {
        notifications,
        total,
        unread,
    }))
}

// ── GET /notifications/unread-count ───────────────────────────────────────

pub async fn unread_count(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<UnreadCountResponse>, AppError> {
    auth.require_permission("read")?;
    let (count,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE")
            .bind(auth.user_id)
            .fetch_one(&state.db)
            .await
            .map_err(AppError::internal)?;

    Ok(Json(UnreadCountResponse { count }))
}

// ── PATCH /notifications/:id/read ─────────────────────────────────────────

pub async fn mark_read(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(notification_id): Path<Uuid>,
) -> Result<Json<NotificationResponse>, AppError> {
    auth.require_permission("read")?;
    let notification = sqlx::query_as::<_, NotificationResponse>(
        "UPDATE notifications SET is_read = TRUE
         WHERE id = $1 AND user_id = $2
         RETURNING id, kind, title, body, link, is_read, created_at",
    )
    .bind(notification_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    Ok(Json(notification))
}

// ── POST /notifications/read-all ──────────────────────────────────────────

pub async fn mark_all_read(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_permission("read")?;
    let result = sqlx::query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    )
    .bind(auth.user_id)
    .execute(&state.db)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(serde_json::json!({
        "marked_read": result.rows_affected()
    })))
}

// ── Helper: Create a notification (for use by other modules) ──────────────

/// Insert a notification for a user. Call from other handlers when events occur.
pub async fn create_notification(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    kind: &str,
    title: &str,
    body: Option<&str>,
    link: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO notifications (user_id, kind, title, body, link)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(user_id)
    .bind(kind)
    .bind(title)
    .bind(body)
    .bind(link)
    .execute(pool)
    .await?;
    Ok(())
}
