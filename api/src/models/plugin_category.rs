use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Junction table: many-to-many relationship between plugins and categories.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginCategory {
    pub plugin_id: Uuid,
    pub category_id: Uuid,
}
