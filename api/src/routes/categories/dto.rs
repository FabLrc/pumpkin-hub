use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// Public representation of a category returned by the API.
#[derive(Debug, Serialize)]
pub struct CategoryResponse {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub display_order: i32,
    pub created_at: DateTime<Utc>,
}
