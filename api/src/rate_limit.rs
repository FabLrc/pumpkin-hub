use axum::extract::ConnectInfo;
use axum::http::{header, HeaderMap, Request};
use ipnet::IpNet;
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

/// IP key extractor that accepts forwarded client IP headers only from configured
/// reverse proxy CIDRs.
#[derive(Clone, Debug)]
pub struct PeerIpExtractor {
    trusted_proxy_cidrs: Vec<IpNet>,
}

impl PeerIpExtractor {
    pub fn new(trusted_proxy_cidrs: Vec<IpNet>) -> Self {
        Self {
            trusted_proxy_cidrs,
        }
    }
}

impl KeyExtractor for PeerIpExtractor {
    type Key = IpAddr;

    fn name(&self) -> &'static str {
        "peer IP"
    }

    fn extract<T>(&self, req: &axum::http::Request<T>) -> Result<IpAddr, GovernorError> {
        Ok(client_ip(req, &self.trusted_proxy_cidrs))
    }
}

/// Returns the address used for rate limiting. Forwarded headers are ignored
/// unless the direct peer belongs to a configured trusted proxy CIDR.
pub fn client_ip<T>(request: &Request<T>, trusted_proxy_cidrs: &[IpNet]) -> IpAddr {
    let peer_ip = request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|addr| addr.ip())
        .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST));

    if !is_trusted_proxy(peer_ip, trusted_proxy_cidrs) {
        return peer_ip;
    }

    forwarded_client_ip(request.headers(), trusted_proxy_cidrs).unwrap_or(peer_ip)
}

fn is_trusted_proxy(ip: IpAddr, trusted_proxy_cidrs: &[IpNet]) -> bool {
    trusted_proxy_cidrs.iter().any(|cidr| cidr.contains(&ip))
}

fn forwarded_client_ip(headers: &HeaderMap, trusted_proxy_cidrs: &[IpNet]) -> Option<IpAddr> {
    let forwarded = header_ips(headers, header::FORWARDED, parse_forwarded_for);
    let x_forwarded_for = header_ips(headers, "x-forwarded-for", parse_ip_address);

    rightmost_untrusted(forwarded, trusted_proxy_cidrs)
        .or_else(|| rightmost_untrusted(x_forwarded_for, trusted_proxy_cidrs))
}

fn header_ips(
    headers: &HeaderMap,
    name: impl axum::http::header::AsHeaderName,
    parse: fn(&str) -> Option<IpAddr>,
) -> Vec<IpAddr> {
    headers
        .get_all(name)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .filter_map(parse)
        .collect()
}

fn parse_forwarded_for(entry: &str) -> Option<IpAddr> {
    entry.split(';').find_map(|parameter| {
        let (name, value) = parameter.trim().split_once('=')?;
        name.eq_ignore_ascii_case("for")
            .then(|| parse_ip_address(value))
            .flatten()
    })
}

fn parse_ip_address(value: &str) -> Option<IpAddr> {
    let value = value.trim().trim_matches('"');
    if value.eq_ignore_ascii_case("unknown") || value.starts_with('_') {
        return None;
    }

    if let Some(bracketed) = value.strip_prefix('[') {
        let (address, _) = bracketed.split_once(']')?;
        return address.parse().ok();
    }

    value
        .parse()
        .ok()
        .or_else(|| value.parse::<SocketAddr>().ok().map(|address| address.ip()))
}

fn rightmost_untrusted(ips: Vec<IpAddr>, trusted_proxy_cidrs: &[IpNet]) -> Option<IpAddr> {
    ips.into_iter()
        .rev()
        .find(|ip| !is_trusted_proxy(*ip, trusted_proxy_cidrs))
}

/// Concrete governor config type with rate-limit headers enabled.
pub type AppGovernorConfig =
    GovernorConfig<PeerIpExtractor, governor::middleware::StateInformationMiddleware>;

/// Builds the general (relaxed) rate limiter configuration.
/// Default: 30 requests burst, 1 replenished per second → sustained traffic.
pub fn build_general_governor(
    config: &RateLimitConfig,
    trusted_proxy_cidrs: Vec<IpNet>,
) -> AppGovernorConfig {
    GovernorConfigBuilder::default()
        .key_extractor(PeerIpExtractor::new(trusted_proxy_cidrs))
        .per_second(config.general_per_second)
        .burst_size(config.general_burst_size)
        .use_headers()
        .finish()
        .expect("Invalid general rate limit configuration")
}

/// Builds the auth (strict) rate limiter configuration.
/// Default: 5 requests burst, 1 replenished per 4 seconds → prevents brute-force.
pub fn build_auth_governor(
    config: &RateLimitConfig,
    trusted_proxy_cidrs: Vec<IpNet>,
) -> AppGovernorConfig {
    GovernorConfigBuilder::default()
        .key_extractor(PeerIpExtractor::new(trusted_proxy_cidrs))
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

impl Default for ApiKeyRateLimiters {
    fn default() -> Self {
        Self::new()
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;

    fn trusted_proxies() -> Vec<IpNet> {
        vec![
            "172.20.0.0/16".parse().unwrap(),
            "203.0.113.0/24".parse().unwrap(),
        ]
    }

    fn request(peer: &str) -> Request<Body> {
        let mut request = Request::new(Body::empty());
        request
            .extensions_mut()
            .insert(ConnectInfo(peer.parse::<SocketAddr>().unwrap()));
        request
    }

    #[test]
    fn untrusted_peers_cannot_spoof_forwarded_addresses() {
        let mut request = request("198.51.100.10:443");
        request
            .headers_mut()
            .insert("x-forwarded-for", "192.0.2.1".parse().unwrap());

        assert_eq!(
            client_ip(&request, &trusted_proxies()),
            "198.51.100.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn trusted_proxies_use_the_rightmost_untrusted_forwarded_address() {
        let mut request = request("172.20.0.5:443");
        request.headers_mut().insert(
            "x-forwarded-for",
            "198.51.100.10, 203.0.113.7".parse().unwrap(),
        );

        assert_eq!(
            client_ip(&request, &trusted_proxies()),
            "198.51.100.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn trusted_proxies_support_standard_forwarded_headers() {
        let mut request = request("172.20.0.5:443");
        request.headers_mut().insert(
            header::FORWARDED,
            "for=198.51.100.10;proto=https, for=203.0.113.7"
                .parse()
                .unwrap(),
        );

        assert_eq!(
            client_ip(&request, &trusted_proxies()),
            "198.51.100.10".parse::<IpAddr>().unwrap()
        );
    }
}
