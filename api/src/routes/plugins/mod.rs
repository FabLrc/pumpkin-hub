pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, patch},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/plugins",
            get(handlers::list_plugins).post(handlers::create_plugin),
        )
        .route(
            "/plugins/{slug}",
            get(handlers::get_plugin)
                .put(handlers::update_plugin)
                .delete(handlers::delete_plugin),
        )
        .route(
            "/plugins/{slug}/versions",
            get(handlers::list_versions).post(handlers::create_version),
        )
        .route(
            "/plugins/{slug}/versions/{version}",
            get(handlers::get_version),
        )
        .route(
            "/plugins/{slug}/versions/{version}/yank",
            patch(handlers::yank_version),
        )
        .route(
            "/plugins/{slug}/versions/{version}/binaries",
            get(handlers::list_binaries).post(handlers::upload_binary),
        )
        .route(
            "/plugins/{slug}/versions/{version}/download",
            get(handlers::download_binary),
        )
}
