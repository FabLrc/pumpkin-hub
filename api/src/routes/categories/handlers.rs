use axum::{extract::State, Json};

use crate::{error::AppError, models::category::Category, state::AppState};

use super::dto::CategoryResponse;

/// GET /api/v1/categories — returns active categories ordered by display_order.
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<CategoryResponse>>, AppError> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, slug, description, icon, is_active, display_order, created_at
         FROM categories
         WHERE is_active = TRUE
         ORDER BY display_order, name",
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
            display_order: c.display_order,
            created_at: c.created_at,
        })
        .collect();

    Ok(Json(response))
}
