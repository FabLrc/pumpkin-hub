use axum::{extract::State, Json};

use crate::{error::AppError, models::category::Category, state::AppState};

use super::dto::CategoryResponse;

/// GET /api/v1/categories — returns all categories ordered by name.
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<CategoryResponse>>, AppError> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, slug, description, icon, created_at FROM categories ORDER BY name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    let response: Vec<CategoryResponse> = categories
        .into_iter()
        .map(|c| CategoryResponse {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            icon: c.icon,
            created_at: c.created_at,
        })
        .collect();

    Ok(Json(response))
}
