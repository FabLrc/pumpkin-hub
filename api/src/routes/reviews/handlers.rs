use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    CreateReportRequest, CreateReviewRequest, ListReportsParams, ListReviewsParams,
    RatingDistribution, ReportListResponse, ReportResponse, ResolveReportRequest,
    ReviewAuthorSummary, ReviewListResponse, ReviewResponse, UpdateReviewRequest,
};

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct ReviewWithAuthorRow {
    id: uuid::Uuid,
    plugin_id: uuid::Uuid,
    author_id: uuid::Uuid,
    rating: i16,
    title: Option<String>,
    body: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    author_username: String,
    author_avatar_url: Option<String>,
}

impl ReviewWithAuthorRow {
    fn into_response(self) -> ReviewResponse {
        ReviewResponse {
            id: self.id,
            plugin_id: self.plugin_id,
            author: ReviewAuthorSummary {
                id: self.author_id,
                username: self.author_username,
                avatar_url: self.author_avatar_url,
            },
            rating: self.rating,
            title: self.title,
            body: self.body,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, FromRow)]
struct RatingDistributionRow {
    star_1: Option<i64>,
    star_2: Option<i64>,
    star_3: Option<i64>,
    star_4: Option<i64>,
    star_5: Option<i64>,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// Resolves a plugin slug to its ID, returning NotFound if missing.
async fn resolve_plugin_id(pool: &sqlx::PgPool, slug: &str) -> Result<Uuid, AppError> {
    let row: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM plugins WHERE slug = $1 AND is_active = TRUE")
            .bind(slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    row.map(|(id,)| id).ok_or(AppError::NotFound)
}

/// Returns the author_id of a plugin for ownership checks.
async fn fetch_plugin_author_id(pool: &sqlx::PgPool, plugin_id: Uuid) -> Result<Uuid, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as("SELECT author_id FROM plugins WHERE id = $1")
        .bind(plugin_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?;

    row.map(|(id,)| id).ok_or(AppError::NotFound)
}

/// Reindexes a plugin in Meilisearch after a review mutation (fire-and-forget).
async fn reindex_plugin_in_search(state: &AppState, plugin_id: Uuid) {
    match crate::search::indexer::build_single_plugin_document(&state.db, plugin_id).await {
        Ok(Some(doc)) => {
            if let Err(e) = state.search.index_plugin(&doc).await {
                tracing::warn!(error = %e, %plugin_id, "Failed to reindex plugin after review mutation");
            }
        }
        Ok(None) => {}
        Err(e) => {
            tracing::warn!(error = %e, %plugin_id, "Failed to build plugin document for reindex");
        }
    }
}

// ── GET /plugins/:slug/reviews ──────────────────────────────────────────────

pub async fn list_reviews(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(params): Query<ListReviewsParams>,
) -> Result<Json<ReviewListResponse>, AppError> {
    let pool = &state.db;
    let plugin_id = resolve_plugin_id(pool, &slug).await?;

    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    let reviews = sqlx::query_as::<_, ReviewWithAuthorRow>(
        "SELECT r.id, r.plugin_id, r.author_id, r.rating, r.title, r.body,
                r.created_at, r.updated_at,
                u.username AS author_username, u.avatar_url AS author_avatar_url
         FROM reviews r
         JOIN users u ON u.id = r.author_id
         WHERE r.plugin_id = $1 AND r.is_hidden = FALSE
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(plugin_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let (total,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM reviews WHERE plugin_id = $1 AND is_hidden = FALSE")
            .bind(plugin_id)
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?;

    let dist = sqlx::query_as::<_, RatingDistributionRow>(
        "SELECT
            COUNT(*) FILTER (WHERE rating = 1) AS star_1,
            COUNT(*) FILTER (WHERE rating = 2) AS star_2,
            COUNT(*) FILTER (WHERE rating = 3) AS star_3,
            COUNT(*) FILTER (WHERE rating = 4) AS star_4,
            COUNT(*) FILTER (WHERE rating = 5) AS star_5
         FROM reviews
         WHERE plugin_id = $1 AND is_hidden = FALSE",
    )
    .bind(plugin_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    let rating_distribution = RatingDistribution {
        star_1: dist.star_1.unwrap_or(0),
        star_2: dist.star_2.unwrap_or(0),
        star_3: dist.star_3.unwrap_or(0),
        star_4: dist.star_4.unwrap_or(0),
        star_5: dist.star_5.unwrap_or(0),
    };

    let average_rating = if total > 0 {
        let sum = rating_distribution.star_1
            + rating_distribution.star_2 * 2
            + rating_distribution.star_3 * 3
            + rating_distribution.star_4 * 4
            + rating_distribution.star_5 * 5;
        sum as f64 / total as f64
    } else {
        0.0
    };

    Ok(Json(ReviewListResponse {
        reviews: reviews.into_iter().map(|r| r.into_response()).collect(),
        total,
        average_rating,
        rating_distribution,
    }))
}

// ── POST /plugins/:slug/reviews ─────────────────────────────────────────────

pub async fn create_review(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Json(body): Json<CreateReviewRequest>,
) -> Result<(StatusCode, Json<ReviewResponse>), AppError> {
    auth.require_permission("write")?;
    body.validate()?;

    let pool = &state.db;
    let plugin_id = resolve_plugin_id(pool, &slug).await?;

    // Authors cannot review their own plugin
    let plugin_author_id = fetch_plugin_author_id(pool, plugin_id).await?;
    if plugin_author_id == auth.user_id {
        return Err(AppError::UnprocessableEntity(
            "you cannot review your own plugin".into(),
        ));
    }

    let row = sqlx::query_as::<_, ReviewWithAuthorRow>(
        "INSERT INTO reviews (plugin_id, author_id, rating, title, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, plugin_id, author_id, rating, title, body, created_at, updated_at,
                   (SELECT username FROM users WHERE id = $2) AS author_username,
                   (SELECT avatar_url FROM users WHERE id = $2) AS author_avatar_url",
    )
    .bind(plugin_id)
    .bind(auth.user_id)
    .bind(body.rating)
    .bind(&body.title)
    .bind(&body.body)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("reviews_plugin_id_author_id_key") {
                return AppError::Conflict("you have already reviewed this plugin".into());
            }
        }
        AppError::internal(e)
    })?;

    // Notify the plugin author about the new review
    if let Err(e) = crate::routes::notifications::handlers::create_notification(
        pool,
        plugin_author_id,
        "new_review",
        &format!("{} reviewed your plugin", auth.username),
        Some(&format!("Rated {} stars", body.rating)),
        Some(&format!("/plugins/{slug}")),
    )
    .await
    {
        tracing::warn!(error = %e, "Failed to create review notification");
    }

    reindex_plugin_in_search(&state, plugin_id).await;

    Ok((StatusCode::CREATED, Json(row.into_response())))
}

// ── PUT /plugins/:slug/reviews/:review_id ───────────────────────────────────

pub async fn update_review(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((slug, review_id)): Path<(String, Uuid)>,
    Json(body): Json<UpdateReviewRequest>,
) -> Result<Json<ReviewResponse>, AppError> {
    auth.require_permission("write")?;
    body.validate()?;

    let pool = &state.db;
    let plugin_id = resolve_plugin_id(pool, &slug).await?;

    // Verify the review belongs to the authenticated user
    let existing: Option<(Uuid,)> =
        sqlx::query_as("SELECT author_id FROM reviews WHERE id = $1 AND plugin_id = $2")
            .bind(review_id)
            .bind(plugin_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    let (review_author_id,) = existing.ok_or(AppError::NotFound)?;
    if review_author_id != auth.user_id {
        return Err(AppError::Forbidden);
    }

    let row = sqlx::query_as::<_, ReviewWithAuthorRow>(
        "UPDATE reviews
         SET rating = COALESCE($3, rating),
             title = COALESCE($4, title),
             body = COALESCE($5, body),
             updated_at = now()
         WHERE id = $1 AND plugin_id = $2
         RETURNING id, plugin_id, author_id, rating, title, body, created_at, updated_at,
                   (SELECT username FROM users WHERE id = author_id) AS author_username,
                   (SELECT avatar_url FROM users WHERE id = author_id) AS author_avatar_url",
    )
    .bind(review_id)
    .bind(plugin_id)
    .bind(body.rating)
    .bind(&body.title)
    .bind(&body.body)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    reindex_plugin_in_search(&state, plugin_id).await;

    Ok(Json(row.into_response()))
}

// ── DELETE /plugins/:slug/reviews/:review_id ────────────────────────────────

pub async fn delete_review(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((slug, review_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, AppError> {
    auth.require_permission("write")?;

    let pool = &state.db;
    let plugin_id = resolve_plugin_id(pool, &slug).await?;

    // Fetch the review to check ownership
    let existing: Option<(Uuid,)> =
        sqlx::query_as("SELECT author_id FROM reviews WHERE id = $1 AND plugin_id = $2")
            .bind(review_id)
            .bind(plugin_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?;

    let (review_author_id,) = existing.ok_or(AppError::NotFound)?;

    // Review author, plugin author, or staff can delete
    let plugin_author_id = fetch_plugin_author_id(pool, plugin_id).await?;
    let is_owner = review_author_id == auth.user_id;
    let is_plugin_author = plugin_author_id == auth.user_id;
    let is_staff = auth.role == "admin" || auth.role == "moderator";

    if !is_owner && !is_plugin_author && !is_staff {
        return Err(AppError::Forbidden);
    }

    sqlx::query("DELETE FROM reviews WHERE id = $1")
        .bind(review_id)
        .execute(pool)
        .await
        .map_err(AppError::internal)?;

    reindex_plugin_in_search(&state, plugin_id).await;

    Ok(StatusCode::NO_CONTENT)
}

// ── PATCH /plugins/:slug/reviews/:review_id/hide ────────────────────────────
// Toggle review visibility — for plugin authors and staff.

pub async fn toggle_review_visibility(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((slug, review_id)): Path<(String, Uuid)>,
    Json(body): Json<ToggleVisibilityRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth.require_permission("write")?;

    let pool = &state.db;
    let plugin_id = resolve_plugin_id(pool, &slug).await?;

    let plugin_author_id = fetch_plugin_author_id(pool, plugin_id).await?;
    let is_plugin_author = plugin_author_id == auth.user_id;
    let is_staff = auth.role == "admin" || auth.role == "moderator";

    if !is_plugin_author && !is_staff {
        return Err(AppError::Forbidden);
    }

    let result = sqlx::query(
        "UPDATE reviews SET is_hidden = $3, updated_at = now() WHERE id = $1 AND plugin_id = $2",
    )
    .bind(review_id)
    .bind(plugin_id)
    .bind(body.hidden)
    .execute(pool)
    .await
    .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    reindex_plugin_in_search(&state, plugin_id).await;

    Ok(Json(serde_json::json!({ "hidden": body.hidden })))
}

#[derive(Debug, serde::Deserialize)]
pub struct ToggleVisibilityRequest {
    pub hidden: bool,
}

// ── POST /plugins/:slug/reviews/:review_id/report ───────────────────────────

pub async fn report_review(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((_slug, review_id)): Path<(String, Uuid)>,
    Json(body): Json<CreateReportRequest>,
) -> Result<(StatusCode, Json<ReportResponse>), AppError> {
    auth.require_permission("write")?;
    body.validate()?;

    let pool = &state.db;

    // Ensure the review exists
    let review_exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM reviews WHERE id = $1")
        .bind(review_id)
        .fetch_optional(pool)
        .await
        .map_err(AppError::internal)?;

    if review_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let report = sqlx::query_as::<_, ReportResponse>(
        "INSERT INTO review_reports (review_id, reporter_id, reason, details)
         VALUES ($1, $2, $3, $4)
         RETURNING id, review_id, reporter_id, reason, details, status, resolved_by, resolved_at, created_at",
    )
    .bind(review_id)
    .bind(auth.user_id)
    .bind(&body.reason)
    .bind(&body.details)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("review_reports_review_id_reporter_id_key") {
                return AppError::Conflict("you have already reported this review".into());
            }
        }
        AppError::internal(e)
    })?;

    Ok((StatusCode::CREATED, Json(report)))
}

// ── GET /admin/review-reports ───────────────────────────────────────────────

pub async fn list_reports(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<ListReportsParams>,
) -> Result<Json<ReportListResponse>, AppError> {
    auth.require_staff()?;

    let pool = &state.db;
    let page = params.page();
    let per_page = params.per_page();
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    let status_filter = params.status.as_deref().unwrap_or("pending");

    let reports = sqlx::query_as::<_, ReportResponse>(
        "SELECT id, review_id, reporter_id, reason, details, status, resolved_by, resolved_at, created_at
         FROM review_reports
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(status_filter)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let (total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM review_reports WHERE status = $1")
        .bind(status_filter)
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?;

    Ok(Json(ReportListResponse { reports, total }))
}

// ── PATCH /admin/review-reports/:report_id/resolve ──────────────────────────

pub async fn resolve_report(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(report_id): Path<Uuid>,
    Json(body): Json<ResolveReportRequest>,
) -> Result<Json<ReportResponse>, AppError> {
    auth.require_staff()?;
    body.validate()?;

    let pool = &state.db;

    let report = sqlx::query_as::<_, ReportResponse>(
        "UPDATE review_reports
         SET status = $2, resolved_by = $3, resolved_at = now()
         WHERE id = $1
         RETURNING id, review_id, reporter_id, reason, details, status, resolved_by, resolved_at, created_at",
    )
    .bind(report_id)
    .bind(&body.status)
    .bind(auth.user_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    // If action was taken, hide the review
    if body.status == "action_taken" {
        sqlx::query("UPDATE reviews SET is_hidden = TRUE, updated_at = now() WHERE id = $1")
            .bind(report.review_id)
            .execute(pool)
            .await
            .map_err(AppError::internal)?;
    }

    Ok(Json(report))
}
