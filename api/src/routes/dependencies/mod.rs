pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, put},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/plugins/{slug}/versions/{version}/dependencies",
            get(handlers::list_dependencies).post(handlers::declare_dependency),
        )
        .route(
            "/plugins/{slug}/versions/{version}/dependencies/graph",
            get(handlers::resolve_dependency_graph),
        )
        .route(
            "/plugins/{slug}/versions/{version}/dependencies/{dependency_id}",
            put(handlers::update_dependency).delete(handlers::remove_dependency),
        )
        .route(
            "/plugins/{slug}/dependants",
            get(handlers::list_reverse_dependencies),
        )
}
