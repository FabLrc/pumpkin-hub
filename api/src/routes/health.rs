use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/health", get(health_check))
}

/// Returns the service liveness status.
/// Used by Docker healthchecks and load balancers.
async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "pumpkin-hub-api",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
