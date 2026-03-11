pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, patch, put},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/plugins/{slug}/media",
            get(handlers::list_media).post(handlers::upload_media),
        )
        .route(
            "/plugins/{slug}/media/reorder",
            put(handlers::reorder_media),
        )
        .route(
            "/plugins/{slug}/media/{media_id}",
            patch(handlers::update_media).delete(handlers::delete_media),
        )
}
