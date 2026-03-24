use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    search::{PumpkinVersion, SearchQuery, SearchResponse, Suggestion},
    state::AppState,
};

/// GET /api/v1/search?q=...&category=...&platform=...&pumpkin_version=...&sort=...&page=...&per_page=...
pub async fn search_plugins(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, AppError> {
    let mut response = state.search.search(&query).await?;

    for hit in &mut response.hits {
        hit.icon_url = state
            .storage
            .resolve_url(hit.icon_storage_key.as_deref())
            .await;
    }

    Ok(Json(response))
}

/// GET /api/v1/search/suggest?q=...&limit=...
#[derive(Debug, Deserialize)]
pub struct SuggestParams {
    pub q: String,
    pub limit: Option<usize>,
}

pub async fn suggest(
    State(state): State<AppState>,
    Query(params): Query<SuggestParams>,
) -> Result<Json<Vec<Suggestion>>, AppError> {
    let limit = params.limit.unwrap_or(5).min(10);
    let suggestions = state.search.suggest(&params.q, limit).await?;
    Ok(Json(suggestions))
}

/// GET /api/v1/pumpkin-versions — returns all known Pumpkin MC versions.
pub async fn pumpkin_versions(
    State(state): State<AppState>,
) -> Result<Json<Vec<PumpkinVersion>>, AppError> {
    let versions = state.pumpkin_versions.get_versions().await.map_err(|e| {
        AppError::internal(std::io::Error::other(format!(
            "Failed to fetch Pumpkin versions: {e}"
        )))
    })?;
    Ok(Json(versions))
}
