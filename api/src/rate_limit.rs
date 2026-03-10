use axum::extract::ConnectInfo;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::num::NonZeroU32;
use std::sync::{Arc, RwLock};
use std::time::Duration;
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

// ── Per-IP keyed rate limiter (used by the api_key_middleware) ───────────────

/// Keyed rate limiter for per-IP general traffic.
pub type IpRateLimiter = governor::RateLimiter<
    IpAddr,
    governor::state::keyed::DefaultKeyedStateStore<IpAddr>,
    governor::clock::DefaultClock,
>;

/// Builds a keyed rate limiter for per-IP traffic, matching the former global GovernorLayer.
pub fn build_ip_rate_limiter(config: &RateLimitConfig) -> Arc<IpRateLimiter> {
    let period = Duration::from_secs(config.general_per_second);
    let burst = NonZeroU32::new(config.general_burst_size).expect("general_burst_size must be > 0");
    let quota = governor::Quota::with_period(period)
        .expect("general_per_second must be > 0")
        .allow_burst(burst);

    Arc::new(governor::RateLimiter::keyed(quota))
}

// ── Per-API-key rate limiters ───────────────────────────────────────────────

/// Non-keyed rate limiter instance for a single API key.
type DirectRateLimiter = governor::RateLimiter<
    governor::state::NotKeyed,
    governor::state::InMemoryState,
    governor::clock::DefaultClock,
>;

/// Thread-safe map of per-API-key rate limiters.
/// Each API key gets its own limiter with individually configured quotas.
#[derive(Clone)]
pub struct ApiKeyRateLimiters {
    limiters: Arc<RwLock<HashMap<uuid::Uuid, Arc<DirectRateLimiter>>>>,
}

impl ApiKeyRateLimiters {
    pub fn new() -> Self {
        Self {
            limiters: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Checks the rate limiter for the given API key. Creates one on first use.
    /// Returns `Err(retry_after_seconds)` if the limit is exceeded.
    pub fn check_or_create(
        &self,
        key_id: uuid::Uuid,
        per_second: u64,
        burst_size: u32,
    ) -> Result<(), u64> {
        // Fast path: limiter already exists
        {
            let read = self.limiters.read().expect("rate limiter lock poisoned");
            if let Some(limiter) = read.get(&key_id) {
                return check_limiter(limiter);
            }
        }

        // Slow path: create a new limiter
        let limiter = Arc::new(create_direct_limiter(per_second, burst_size));
        let result = check_limiter(&limiter);

        let mut write = self.limiters.write().expect("rate limiter lock poisoned");
        write.entry(key_id).or_insert(limiter);

        result
    }

    /// Removes the rate limiter for a revoked API key.
    pub fn remove(&self, key_id: &uuid::Uuid) {
        let mut write = self.limiters.write().expect("rate limiter lock poisoned");
        write.remove(key_id);
    }
}

fn create_direct_limiter(per_second: u64, burst_size: u32) -> DirectRateLimiter {
    let per_second = per_second.max(1);
    let burst_size = burst_size.max(1);

    let period = Duration::from_secs(per_second);
    let burst = NonZeroU32::new(burst_size).expect("burst_size validated > 0");
    let quota = governor::Quota::with_period(period)
        .expect("per_second validated > 0")
        .allow_burst(burst);

    governor::RateLimiter::direct(quota)
}

fn check_limiter(limiter: &DirectRateLimiter) -> Result<(), u64> {
    limiter.check().map_err(|not_until| {
        let wait = not_until.wait_time_from(governor::clock::Clock::now(
            &governor::clock::DefaultClock::default(),
        ));
        wait.as_secs().saturating_add(1)
    })
}
