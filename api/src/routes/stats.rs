use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::{error::AppError, state::AppState};

pub fn routes() -> Router<AppState> {
    Router::new().route("/stats", get(get_public_stats))
}

#[derive(Serialize)]
pub struct PublicStatsResponse {
    pub total_plugins: i64,
    pub total_authors: i64,
    pub total_downloads: i64,
}

/// GET /api/v1/stats — Public registry statistics for the homepage.
async fn get_public_stats(
    State(state): State<AppState>,
) -> Result<Json<PublicStatsResponse>, AppError> {
    let pool = &state.db;

    let row: (i64, i64, i64) = sqlx::query_as(
        "SELECT
            COUNT(*) FILTER (WHERE is_active = true),
            COUNT(DISTINCT author_id) FILTER (WHERE is_active = true),
            COALESCE(SUM(downloads_total), 0)::BIGINT
         FROM plugins",
    )
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(PublicStatsResponse {
        total_plugins: row.0,
        total_authors: row.1,
        total_downloads: row.2,
    }))
}
