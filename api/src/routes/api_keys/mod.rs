mod dto;
mod handlers;

use crate::state::AppState;
use axum::{
    routing::{delete, get},
    Router,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api-keys",
            get(handlers::list_api_keys).post(handlers::create_api_key),
        )
        .route("/api-keys/{id}", delete(handlers::revoke_api_key))
}
