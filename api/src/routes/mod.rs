pub mod auth;
mod health;

use axum::Router;

use crate::state::AppState;

/// Assembles all versioned sub-routers under their respective prefixes.
pub fn create_router(state: AppState) -> Router {
    Router::new().nest("/api/v1", v1_routes()).with_state(state)
}

fn v1_routes() -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .merge(auth::routes())
}
