mod dto;
pub mod handlers;

use crate::state::AppState;
use axum::{
    routing::{get, patch, post},
    Router,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/notifications", get(handlers::list_notifications))
        .route("/notifications/unread-count", get(handlers::unread_count))
        .route("/notifications/{id}/read", patch(handlers::mark_read))
        .route("/notifications/read-all", post(handlers::mark_all_read))
}
