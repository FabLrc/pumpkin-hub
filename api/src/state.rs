use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;
use crate::email::EmailService;
use crate::rate_limit::{ApiKeyRateLimiters, IpRateLimiter};
use crate::search::{PumpkinVersionFetcher, SearchService};
use crate::storage::ObjectStorage;

/// Shared application state injected into all handlers via Axum's `State` extractor.
/// Wrap heavy resources in `Arc` to avoid deep cloning on every request.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: PgPool,
    pub storage: ObjectStorage,
    pub search: SearchService,
    pub pumpkin_versions: PumpkinVersionFetcher,
    pub email: Option<EmailService>,
    /// Keyed per-IP rate limiter (replaces the former global GovernorLayer).
    pub ip_rate_limiter: Arc<IpRateLimiter>,
    /// Per-API-key rate limiters with individually configured quotas.
    pub api_key_rate_limiters: ApiKeyRateLimiters,
}

impl AppState {
    pub fn new(
        config: Config,
        db: PgPool,
        storage: ObjectStorage,
        search: SearchService,
        pumpkin_versions: PumpkinVersionFetcher,
        email: Option<EmailService>,
        ip_rate_limiter: Arc<IpRateLimiter>,
        api_key_rate_limiters: ApiKeyRateLimiters,
    ) -> Self {
        Self {
            config: Arc::new(config),
            db,
            storage,
            search,
            pumpkin_versions,
            email,
            ip_rate_limiter,
            api_key_rate_limiters,
        }
    }
}
