mod dto;
mod handlers;

use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // Author dashboard KPIs
        .route("/dashboard/stats", get(handlers::get_author_stats))
        // Author aggregate download chart
        .route("/dashboard/downloads", get(handlers::get_author_downloads))
        // Per-plugin download analytics (public)
        .route(
            "/plugins/{slug}/download-stats",
            get(handlers::get_plugin_download_stats),
        )
}
