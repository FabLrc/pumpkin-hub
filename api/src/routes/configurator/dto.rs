use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Constants ─────────────────────────────────────────────────────────────────

const NAME_MAX_LENGTH: usize = 100;
const MAX_PLUGINS_PER_CONFIG: usize = 50;
const MAX_CONFIGS_PER_USER: i64 = 20;

pub const VALID_PLATFORMS: &[&str] = &["windows", "linux", "macos"];

// ── Request DTOs ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PluginSelection {
    pub plugin_id: Uuid,
    pub version_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateServerConfigRequest {
    pub name: String,
    pub platform: String,
    pub plugins: Vec<PluginSelection>,
}

impl CreateServerConfigRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        validate_name(&self.name)?;
        validate_platform(&self.platform)?;
        validate_plugin_count(&self.plugins)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateServerConfigRequest {
    pub name: Option<String>,
    pub platform: Option<String>,
    pub plugins: Option<Vec<PluginSelection>>,
}

impl UpdateServerConfigRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref name) = self.name {
            validate_name(name)?;
        }
        if let Some(ref platform) = self.platform {
            validate_platform(platform)?;
        }
        if let Some(ref plugins) = self.plugins {
            validate_plugin_count(plugins)?;
        }
        Ok(())
    }
}

/// Request body for ephemeral ZIP download (no config saved) and for validation.
#[derive(Debug, Deserialize)]
pub struct DownloadPreviewRequest {
    pub platform: String,
    pub plugins: Vec<PluginSelection>,
}

impl DownloadPreviewRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        validate_platform(&self.platform)?;
        validate_plugin_count(&self.plugins)?;
        Ok(())
    }
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ServerConfigPluginEntry {
    pub plugin_id: Uuid,
    pub plugin_name: String,
    pub plugin_slug: String,
    pub version_id: Uuid,
    pub version: String,
    pub is_auto_dep: bool,
}

#[derive(Debug, Serialize)]
pub struct ServerConfigResponse {
    pub id: Uuid,
    pub name: String,
    pub platform: String,
    pub share_token: Uuid,
    pub plugins: Vec<ServerConfigPluginEntry>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ServerConfigListResponse {
    pub configs: Vec<ServerConfigSummary>,
}

/// Response for `POST /validate` — lists fully resolved plugins (user-selected + auto-deps).
#[derive(Debug, Serialize)]
pub struct ValidateConfigResponse {
    pub platform: String,
    pub plugins: Vec<ServerConfigPluginEntry>,
}

#[derive(Debug, Serialize)]
pub struct ServerConfigSummary {
    pub id: Uuid,
    pub name: String,
    pub platform: String,
    pub share_token: Uuid,
    pub plugin_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── Validation helpers ────────────────────────────────────────────────────────

fn validate_name(name: &str) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::UnprocessableEntity(
            "name cannot be empty".into(),
        ));
    }
    if trimmed.len() > NAME_MAX_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "name exceeds the maximum length of {NAME_MAX_LENGTH} characters"
        )));
    }
    Ok(())
}

pub fn validate_platform(platform: &str) -> Result<(), AppError> {
    if !VALID_PLATFORMS.contains(&platform) {
        return Err(AppError::UnprocessableEntity(format!(
            "platform must be one of: {}",
            VALID_PLATFORMS.join(", ")
        )));
    }
    Ok(())
}

fn validate_plugin_count(plugins: &[PluginSelection]) -> Result<(), AppError> {
    if plugins.len() > MAX_PLUGINS_PER_CONFIG {
        return Err(AppError::UnprocessableEntity(format!(
            "a configuration may include at most {MAX_PLUGINS_PER_CONFIG} plugins"
        )));
    }
    Ok(())
}

pub const fn max_configs_per_user() -> i64 {
    MAX_CONFIGS_PER_USER
}
