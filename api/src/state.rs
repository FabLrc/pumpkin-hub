use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;

/// Shared application state injected into all handlers via Axum's `State` extractor.
/// Wrap heavy resources in `Arc` to avoid deep cloning on every request.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: PgPool,
}

impl AppState {
    pub fn new(config: Config, db: PgPool) -> Self {
        Self {
            config: Arc::new(config),
            db,
        }
    }
}
