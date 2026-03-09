use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ChangeRoleRequest {
    pub role: String,
}

impl ChangeRoleRequest {
    pub fn validate(&self) -> Result<(), &'static str> {
        match self.role.as_str() {
            "admin" | "moderator" | "author" => Ok(()),
            _ => Err("Invalid role. Must be 'admin', 'moderator', or 'author'"),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AdminListParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

const DEFAULT_PAGE: u32 = 1;
const DEFAULT_PER_PAGE: u32 = 20;
const MAX_PER_PAGE: u32 = 100;

impl AdminListParams {
    pub fn page(&self) -> u32 {
        self.page.unwrap_or(DEFAULT_PAGE).max(1)
    }

    pub fn per_page(&self) -> u32 {
        self.per_page
            .unwrap_or(DEFAULT_PER_PAGE)
            .clamp(1, MAX_PER_PAGE)
    }
}

// ── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AdminStatsResponse {
    pub total_users: i64,
    pub total_plugins: i64,
    pub total_downloads: i64,
    pub active_plugins: i64,
    pub deactivated_plugins: i64,
    pub recent_audit_logs: Vec<AuditLogEntry>,
}

#[derive(Debug, Serialize)]
pub struct AdminPluginEntry {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub author_username: String,
    pub downloads_total: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct AdminUserEntry {
    pub id: Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub plugin_count: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub actor_username: String,
    pub action: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: u32,
    pub per_page: u32,
    pub total: i64,
    pub total_pages: u32,
}
