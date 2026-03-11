pub(crate) mod dto;
pub(crate) mod handlers;
pub(crate) mod webhook;

use axum::{
    routing::{get, post},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // GitHub integration management (authenticated)
        .route(
            "/plugins/{slug}/github",
            get(handlers::get_github_link).delete(handlers::unlink_github),
        )
        .route("/plugins/{slug}/github/link", post(handlers::link_github))
        // List repos for an installation (authenticated, used by repo picker)
        .route(
            "/github/installations/{installation_id}/repositories",
            get(handlers::list_installation_repos),
        )
        // List all repos the authenticated user can access via the GitHub App
        .route(
            "/github/my-repositories",
            get(handlers::list_my_repositories),
        )
        // Publish a new plugin directly from a GitHub repository (authenticated)
        .route(
            "/plugins/from-github",
            post(handlers::publish_plugin_from_github),
        )
        // Webhook endpoint (public, signature-verified)
        .route("/webhooks/github", post(webhook::handle_github_webhook))
        // Dynamic badge (public, no auth)
        .route("/plugins/{slug}/badge.svg", get(handlers::plugin_badge))
}
