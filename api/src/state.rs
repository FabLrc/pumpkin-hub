use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;
use crate::storage::ObjectStorage;

/// Shared application state injected into all handlers via Axum's `State` extractor.
/// Wrap heavy resources in `Arc` to avoid deep cloning on every request.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: PgPool,
    pub storage: ObjectStorage,
}

impl AppState {
    pub fn new(config: Config, db: PgPool, storage: ObjectStorage) -> Self {
        Self {
            config: Arc::new(config),
            db,
            storage,
        }
    }
}
