use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Binary {
    pub id: Uuid,
    pub version_id: Uuid,
    pub file_name: String,
    pub file_size: i64,
    pub checksum_sha256: String,
    pub storage_key: String,
    pub content_type: String,
    pub uploaded_at: DateTime<Utc>,
}
