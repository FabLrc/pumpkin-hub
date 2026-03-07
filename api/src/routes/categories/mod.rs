mod dto;
mod handlers;

use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/categories", get(handlers::list_categories))
}
