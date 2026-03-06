mod dto;
mod handlers;

use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/plugins", get(handlers::list_plugins).post(handlers::create_plugin))
        .route(
            "/plugins/{slug}",
            get(handlers::get_plugin)
                .put(handlers::update_plugin)
                .delete(handlers::delete_plugin),
        )
}
