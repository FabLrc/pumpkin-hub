use tower_governor::{
    governor::GovernorConfig, governor::GovernorConfigBuilder, key_extractor::PeerIpKeyExtractor,
};

use crate::config::RateLimitConfig;

/// Concrete governor config type with rate-limit headers enabled.
pub type AppGovernorConfig =
    GovernorConfig<PeerIpKeyExtractor, governor::middleware::StateInformationMiddleware>;

/// Builds the general (relaxed) rate limiter configuration.
/// Default: 30 requests burst, 1 replenished per second → sustained traffic.
pub fn build_general_governor(config: &RateLimitConfig) -> AppGovernorConfig {
    GovernorConfigBuilder::default()
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
        .per_second(config.auth_per_second)
        .burst_size(config.auth_burst_size)
        .use_headers()
        .finish()
        .expect("Invalid auth rate limit configuration")
}
