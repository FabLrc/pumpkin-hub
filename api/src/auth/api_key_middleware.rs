use axum::{
    extract::{ConnectInfo, Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use crate::{
    auth::middleware::{extract_api_key_from_header_value, resolve_api_key, API_KEY_HEADER},
    state::AppState,
};

/// Axum middleware that handles:
/// 1. API key pre-resolution (stores `ApiKeyContext` in request extensions)
/// 2. Per-API-key rate limiting (replaces the global limiter for API key requests)
/// 3. IP-based rate limiting fallback (for non-API-key requests)
/// 4. Audit trail recording (fire-and-forget, after handler)
pub async fn api_key_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_string();

    // Extract caller IP (same fallback as PeerIpExtractor)
    let ip = request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|addr| addr.ip())
        .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST));

    // Try API key authentication
    let api_key_value = request
        .headers()
        .get(API_KEY_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(extract_api_key_from_header_value);

    if let Some(raw_key) = api_key_value {
        return handle_api_key_request(raw_key, request, next, &state, &method, &path).await;
    }

    // No API key — apply global IP-based rate limiting
    if let Err(response) = check_ip_rate_limit(&state, ip) {
        return *response;
    }

    next.run(request).await
}

/// Handles a request authenticated with an API key:
/// validates the key, applies per-key rate limiting, runs the handler, and records audit.
async fn handle_api_key_request(
    raw_key: String,
    mut request: Request,
    next: Next,
    state: &AppState,
    method: &Method,
    path: &str,
) -> Response {
    match resolve_api_key(&raw_key, state).await {
        Ok(ctx) => {
            let api_key_id = ctx.api_key_id;
            let rl_per_second = ctx.rate_limit_per_second;
            let rl_burst_size = ctx.rate_limit_burst_size;

            // Per-key rate limiting
            if let Err(response) =
                check_api_key_rate_limit(state, api_key_id, rl_per_second, rl_burst_size)
            {
                record_usage(state, api_key_id, method, path, false);
                return *response;
            }

            // Inject context for the AuthUser extractor
            request.extensions_mut().insert(ctx);

            let response = next.run(request).await;
            let success = response.status().is_success();

            record_usage(state, api_key_id, method, path, success);

            response
        }
        Err(_) => {
            // Invalid API key — let the request through.
            // If the handler requires auth, AuthUser will return 401.
            next.run(request).await
        }
    }
}

// ── Rate Limiting ───────────────────────────────────────────────────────────

fn check_ip_rate_limit(state: &AppState, ip: IpAddr) -> Result<(), Box<Response>> {
    state
        .ip_rate_limiter
        .check_key(&ip)
        .map(|_| ())
        .map_err(|not_until| {
            let wait = not_until.wait_time_from(governor::clock::Clock::now(
                &governor::clock::DefaultClock::default(),
            ));
            let retry_after = wait.as_secs().saturating_add(1);
            Box::new(build_rate_limit_response(retry_after))
        })
}

fn check_api_key_rate_limit(
    state: &AppState,
    api_key_id: uuid::Uuid,
    per_second: i32,
    burst_size: i32,
) -> Result<(), Box<Response>> {
    state
        .api_key_rate_limiters
        .check_or_create(api_key_id, per_second as u64, burst_size as u32)
        .map_err(|retry_after| Box::new(build_rate_limit_response(retry_after)))
}

fn build_rate_limit_response(retry_after: u64) -> Response {
    (
        StatusCode::TOO_MANY_REQUESTS,
        [("retry-after", retry_after.to_string())],
        Json(json!({ "error": "Rate limit exceeded" })),
    )
        .into_response()
}

// ── Audit Recording ─────────────────────────────────────────────────────────

/// Fires-and-forgets an INSERT into `api_key_usage_logs`.
fn record_usage(
    state: &AppState,
    api_key_id: uuid::Uuid,
    method: &Method,
    path: &str,
    success: bool,
) {
    let action = infer_action(method, path);
    let resource = path.to_string();
    let db = state.db.clone();

    tokio::spawn(async move {
        let _ = sqlx::query(
            "INSERT INTO api_key_usage_logs (api_key_id, action, resource, success)
             VALUES ($1, $2, $3, $4)",
        )
        .bind(api_key_id)
        .bind(&action)
        .bind(&resource)
        .bind(success)
        .execute(&db)
        .await;
    });
}

/// Infers a human-readable action from the HTTP method and request path.
fn infer_action(method: &Method, path: &str) -> String {
    let stripped = path
        .strip_prefix("/api/v1")
        .unwrap_or(path)
        .trim_end_matches('/');

    let kind = if stripped.contains("/binaries") {
        "binary"
    } else if stripped.contains("/versions") {
        "version"
    } else if stripped.starts_with("/plugins") || stripped.starts_with("/search") {
        "plugin"
    } else if stripped.starts_with("/api-keys") {
        "api_key"
    } else if stripped.starts_with("/dashboard") {
        "dashboard"
    } else if stripped.starts_with("/notifications") {
        "notification"
    } else {
        "other"
    };

    let verb = match *method {
        Method::GET => "read",
        Method::POST => "create",
        Method::PUT | Method::PATCH => "update",
        Method::DELETE => "delete",
        _ => "other",
    };

    format!("{kind}.{verb}")
}
