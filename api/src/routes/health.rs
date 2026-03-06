use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use serde_json::{json, Value};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/health", get(health_check))
}

/// Returns the service liveness status including database connectivity.
/// Used by Docker healthchecks and load balancers.
async fn health_check(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    let db_status = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await;

    let (status, db_label) = match db_status {
        Ok(_) => (StatusCode::OK, "connected"),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, "disconnected"),
    };

    (
        status,
        Json(json!({
            "status": if status == StatusCode::OK { "ok" } else { "degraded" },
            "service": "pumpkin-hub-api",
            "version": env!("CARGO_PKG_VERSION"),
            "database": db_label,
        })),
    )
}
