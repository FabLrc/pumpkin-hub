mod admin;
mod api_keys;
pub mod auth;
mod categories;
mod changelogs;
mod dashboard;
mod dependencies;
mod github;
mod health;
mod media;
pub mod notifications;
pub(crate) mod plugins;
mod reviews;
mod search;
mod stats;
mod users;

use std::sync::Arc;

use axum::Router;

use crate::rate_limit::AppGovernorConfig;
use crate::state::AppState;

/// Assembles all versioned sub-routers under their respective prefixes.
/// `auth_governor` is applied only to auth-sensitive routes (register, login, OAuth).
pub fn create_router(state: AppState, auth_governor: Arc<AppGovernorConfig>) -> Router {
    Router::new()
        .nest("/api/v1", v1_routes(auth_governor))
        .with_state(state)
}

fn v1_routes(auth_governor: Arc<AppGovernorConfig>) -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .merge(auth::routes(auth_governor))
        .merge(categories::routes())
        .merge(plugins::routes())
        .merge(dependencies::routes())
        .merge(search::routes())
        .merge(stats::routes())
        .merge(users::routes())
        .merge(dashboard::routes())
        .merge(api_keys::routes())
        .merge(notifications::routes())
        .merge(reviews::routes())
        .merge(media::routes())
        .merge(changelogs::routes())
        .merge(admin::routes())
        .merge(github::routes())
}
