use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// A media item (image or video) in a plugin's gallery.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginMedia {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub uploaded_by: Uuid,
    pub media_type: String,
    pub file_name: String,
    pub file_size: i64,
    pub content_type: String,
    pub storage_key: String,
    pub thumbnail_key: Option<String>,
    pub caption: Option<String>,
    pub sort_order: i32,
    pub uploaded_at: DateTime<Utc>,
}
