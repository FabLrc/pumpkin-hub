mod handlers;

use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/search", get(handlers::search_plugins))
        .route("/search/suggest", get(handlers::suggest))
        .route("/pumpkin-versions", get(handlers::pumpkin_versions))
}
