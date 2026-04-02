pub mod auth;
pub mod config;
pub mod db;
pub mod email;
pub mod error;
pub mod github;
pub mod models;
pub mod rate_limit;
pub mod routes;
pub mod search;
pub mod state;
pub mod storage;

use axum::{
    extract::DefaultBodyLimit,
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE},
        HeaderValue, Method,
    },
    middleware as axum_middleware, Router,
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

use crate::{
    config::Config,
    email::EmailService,
    rate_limit::ApiKeyRateLimiters,
    search::{PumpkinVersionFetcher, SearchService},
    state::AppState,
    storage::{pumpkin_binary::PumpkinBinaryCache, ObjectStorage},
};

const REQUEST_ID_HEADER: &str = "x-request-id";

/// Builds the fully configured Axum application.
/// Separated from `main` to allow integration testing without binding a port.
pub fn build_app(
    config: Config,
    pool: PgPool,
    storage: ObjectStorage,
    search: SearchService,
    pumpkin_versions: PumpkinVersionFetcher,
    pumpkin_binary_cache: PumpkinBinaryCache,
) -> Router {
    let email_service = config.smtp.as_ref().and_then(|smtp_cfg| {
        let frontend_url = config
            .server
            .allowed_origins
            .first()
            .cloned()
            .unwrap_or_else(|| "http://localhost:3000".to_string());
        match EmailService::new(smtp_cfg, &frontend_url) {
            Ok(svc) => {
                tracing::info!("SMTP email service configured");
                Some(svc)
            }
            Err(e) => {
                tracing::warn!(error = %e, "Failed to initialise SMTP — email features disabled");
                None
            }
        }
    });

    // Rate limiters
    let ip_rate_limiter = rate_limit::build_ip_rate_limiter(&config.rate_limit);
    let api_key_rate_limiters = ApiKeyRateLimiters::new();
    let auth_governor = rate_limit::build_auth_governor(&config.rate_limit);

    let state = AppState::new(
        config.clone(),
        pool,
        storage,
        search,
        pumpkin_versions,
        pumpkin_binary_cache,
        email_service,
        ip_rate_limiter.clone(),
        api_key_rate_limiters,
    );
    let cors = build_cors_layer(&config);
    let x_request_id = axum::http::HeaderName::from_static(REQUEST_ID_HEADER);

    // Spawn background task to clean up expired rate-limit entries
    let ip_limiter_for_cleanup = ip_rate_limiter;
    let auth_limiter = auth_governor.limiter().clone();
    tokio::spawn(async move {
        let interval = std::time::Duration::from_secs(60);
        loop {
            tokio::time::sleep(interval).await;
            ip_limiter_for_cleanup.retain_recent();
            auth_limiter.retain_recent();
        }
    });

    let auth_governor = std::sync::Arc::new(auth_governor);

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
    // Note: the former global GovernorLayer is replaced by the api_key_middleware
    // which applies per-API-key quotas or per-IP limits depending on the request.

    // Cap the global body limit just above the maximum allowed binary size
    // (+ 5 MB overhead for multipart metadata).
    // The binary upload handler also enforces this limit via `binary_max_size_bytes`
    // for a precise error message; this layer acts as a backstop for all other routes.
    let body_limit = usize::try_from(config.binary_max_size_bytes)
        .unwrap_or(usize::MAX)
        .saturating_add(5 * 1024 * 1024);

    let state_for_middleware = state.clone();

    routes::create_router(state, auth_governor)
        .layer(axum_middleware::from_fn_with_state(
            state_for_middleware,
            auth::api_key_middleware::api_key_middleware,
        ))
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
