pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod models;
pub mod routes;
pub mod state;
pub mod storage;

use axum::{
    extract::DefaultBodyLimit,
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE},
        HeaderValue, Method,
    },
    Router,
};
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use sqlx::PgPool;

use crate::{config::Config, state::AppState, storage::ObjectStorage};

const REQUEST_ID_HEADER: &str = "x-request-id";

/// Builds the fully configured Axum application.
/// Separated from `main` to allow integration testing without binding a port.
pub fn build_app(config: Config, pool: PgPool, storage: ObjectStorage) -> Router {
    let state = AppState::new(config.clone(), pool, storage);
    let cors = build_cors_layer(&config);
    let x_request_id = axum::http::HeaderName::from_static(REQUEST_ID_HEADER);

    let middleware = ServiceBuilder::new()
        // Assign a unique ID to every incoming request
        .layer(SetRequestIdLayer::new(
            x_request_id.clone(),
            MakeRequestUuid,
        ))
        // Structured traces with span per request
        .layer(TraceLayer::new_for_http())
        // Propagate request ID into response headers for traceability
        .layer(PropagateRequestIdLayer::new(x_request_id))
        // Global 30-second timeout — 504 Gateway Timeout on expiry
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::GATEWAY_TIMEOUT,
            std::time::Duration::from_secs(30),
        ))
        // Gzip compression for applicable responses
        .layer(CompressionLayer::new())
        // CORS policy
        .layer(cors);

    // Cap the global body limit just above the maximum allowed binary size
    // (+ 5 MB overhead for multipart metadata).
    // The binary upload handler also enforces this limit via `binary_max_size_bytes`
    // for a precise error message; this layer acts as a backstop for all other routes.
    let body_limit = usize::try_from(config.binary_max_size_bytes)
        .unwrap_or(usize::MAX)
        .saturating_add(5 * 1024 * 1024);
    routes::create_router(state)
        .layer(DefaultBodyLimit::max(body_limit))
        .layer(middleware)
}

fn build_cors_layer(config: &Config) -> CorsLayer {
    let origins: Vec<HeaderValue> = config
        .server
        .allowed_origins
        .iter()
        .filter_map(|origin| origin.parse::<HeaderValue>().ok())
        .collect();

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([CONTENT_TYPE, AUTHORIZATION])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600))
}
