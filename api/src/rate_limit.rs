use axum::extract::ConnectInfo;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use tower_governor::{
    governor::GovernorConfig, governor::GovernorConfigBuilder, key_extractor::KeyExtractor,
    GovernorError,
};

use crate::config::RateLimitConfig;

/// IP key extractor that gracefully falls back to `127.0.0.1` when `ConnectInfo`
/// is absent from request extensions.
///
/// In production, `ConnectInfo<SocketAddr>` is injected by
/// `Router::into_make_service_with_connect_info`, so every real request carries
/// the caller's IP.  In integration tests, `tower::ServiceExt::oneshot` skips
/// that plumbing entirely; without a fallback the governor returns HTTP 500 for
/// every call.
#[derive(Clone, Debug, Default)]
pub struct PeerIpExtractor;

impl KeyExtractor for PeerIpExtractor {
    type Key = IpAddr;

    fn name(&self) -> &'static str {
        "peer IP"
    }

    fn extract<T>(&self, req: &axum::http::Request<T>) -> Result<IpAddr, GovernorError> {
        Ok(req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|addr| addr.ip())
            .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST)))
    }
}

/// Concrete governor config type with rate-limit headers enabled.
pub type AppGovernorConfig =
    GovernorConfig<PeerIpExtractor, governor::middleware::StateInformationMiddleware>;

/// Builds the general (relaxed) rate limiter configuration.
/// Default: 30 requests burst, 1 replenished per second → sustained traffic.
pub fn build_general_governor(config: &RateLimitConfig) -> AppGovernorConfig {
    GovernorConfigBuilder::default()
        .key_extractor(PeerIpExtractor)
        .per_second(config.general_per_second)
        .burst_size(config.general_burst_size)
        .use_headers()
        .finish()
        .expect("Invalid general rate limit configuration")
}

/// Builds the auth (strict) rate limiter configuration.
/// Default: 5 requests burst, 1 replenished per 4 seconds → prevents brute-force.
pub fn build_auth_governor(config: &RateLimitConfig) -> AppGovernorConfig {
    GovernorConfigBuilder::default()
        .key_extractor(PeerIpExtractor)
        .per_second(config.auth_per_second)
        .burst_size(config.auth_burst_size)
        .use_headers()
        .finish()
        .expect("Invalid auth rate limit configuration")
}
