pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/plugins/{slug}/changelog",
        get(handlers::get_changelog)
            .put(handlers::update_changelog)
            .delete(handlers::delete_changelog),
    )
}
