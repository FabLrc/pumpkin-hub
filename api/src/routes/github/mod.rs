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
        // Webhook endpoint (public, signature-verified)
        .route("/webhooks/github", post(webhook::handle_github_webhook))
        // Dynamic badge (public, no auth)
        .route("/plugins/{slug}/badge.svg", get(handlers::plugin_badge))
}
