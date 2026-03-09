pub mod auth;
mod categories;
mod dependencies;
mod health;
mod plugins;
mod search;

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
        .merge(categories::routes())
        .merge(plugins::routes())
        .merge(dependencies::routes())
        .merge(search::routes())
}
