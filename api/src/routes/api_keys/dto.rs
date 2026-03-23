use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Request body for creating an API key.
#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<String>,
    /// Optional expiration date (ISO 8601).
    pub expires_at: Option<DateTime<Utc>>,
    /// Replenish interval in seconds (default: 1 = 1 token/second).
    pub rate_limit_per_second: Option<i32>,
    /// Burst capacity (default: 30).
    pub rate_limit_burst_size: Option<i32>,
}

/// Response returned once at creation (includes the full raw key).
#[derive(Debug, Serialize)]
pub struct CreateApiKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub key: String,
    pub key_prefix: String,
    pub permissions: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub rate_limit_per_second: i32,
    pub rate_limit_burst_size: i32,
    pub created_at: DateTime<Utc>,
}

/// Summary returned for list / detail (key is redacted).
#[derive(Debug, Serialize)]
pub struct ApiKeySummary {
    pub id: Uuid,
    pub name: String,
    pub key_prefix: String,
    pub permissions: Vec<String>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub rate_limit_per_second: i32,
    pub rate_limit_burst_size: i32,
    pub created_at: DateTime<Utc>,
}

const MAX_API_KEY_NAME_LENGTH: usize = 64;
const MAX_KEYS_PER_USER: i64 = 10;
const DEFAULT_RATE_LIMIT_PER_SECOND: i32 = 1;
const DEFAULT_RATE_LIMIT_BURST_SIZE: i32 = 30;
const MAX_RATE_LIMIT_BURST_SIZE: i32 = 500;

impl CreateApiKeyRequest {
    pub fn validate(&self) -> Result<(), String> {
        let name = self.name.trim();
        if name.is_empty() {
            return Err("API key name is required".into());
        }
        if name.len() > MAX_API_KEY_NAME_LENGTH {
            return Err(format!(
                "API key name must be at most {} characters",
                MAX_API_KEY_NAME_LENGTH
            ));
        }

        let valid_permissions = ["publish", "upload", "read"];
        for perm in &self.permissions {
            if !valid_permissions.contains(&perm.as_str()) {
                return Err(format!(
                    "Invalid permission '{}'. Valid values: {}",
                    perm,
                    valid_permissions.join(", ")
                ));
            }
        }

        if let Some(expires) = self.expires_at {
            if expires <= Utc::now() {
                return Err("Expiration date must be in the future".into());
            }
        }

        if let Some(rps) = self.rate_limit_per_second {
            if rps < 1 {
                return Err("rate_limit_per_second must be at least 1".into());
            }
        }

        if let Some(burst) = self.rate_limit_burst_size {
            validate_burst_size(burst)?;
        }

        Ok(())
    }

    pub fn rate_limit_per_second(&self) -> i32 {
        self.rate_limit_per_second
            .unwrap_or(DEFAULT_RATE_LIMIT_PER_SECOND)
    }

    pub fn rate_limit_burst_size(&self) -> i32 {
        self.rate_limit_burst_size
            .unwrap_or(DEFAULT_RATE_LIMIT_BURST_SIZE)
    }
}

fn validate_burst_size(burst: i32) -> Result<(), String> {
    if burst < 1 {
        return Err("rate_limit_burst_size must be at least 1".into());
    }
    if burst > MAX_RATE_LIMIT_BURST_SIZE {
        return Err(format!(
            "rate_limit_burst_size must be at most {}",
            MAX_RATE_LIMIT_BURST_SIZE
        ));
    }
    Ok(())
}

pub const fn max_keys_per_user() -> i64 {
    MAX_KEYS_PER_USER
}
