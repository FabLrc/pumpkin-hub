use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;
use crate::email::EmailService;
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
}

impl AppState {
    pub fn new(
        config: Config,
        db: PgPool,
        storage: ObjectStorage,
        search: SearchService,
        pumpkin_versions: PumpkinVersionFetcher,
        email: Option<EmailService>,
    ) -> Self {
        Self {
            config: Arc::new(config),
            db,
            storage,
            search,
            pumpkin_versions,
            email,
        }
    }
}
