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
    pub created_at: DateTime<Utc>,
}

const MAX_API_KEY_NAME_LENGTH: usize = 64;
const MAX_KEYS_PER_USER: i64 = 10;

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

        Ok(())
    }
}

pub const fn max_keys_per_user() -> i64 {
    MAX_KEYS_PER_USER
}
