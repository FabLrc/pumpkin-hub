use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

// ── Validation Constants ────────────────────────────────────────────────────

const CHANGELOG_MAX_LENGTH: usize = 200_000;

// ── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ChangelogResponse {
    pub plugin_slug: String,
    pub content: String,
    pub source: String,
    pub updated_at: DateTime<Utc>,
}

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UpdateChangelogRequest {
    pub content: String,
}

impl UpdateChangelogRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.content.is_empty() {
            return Err(AppError::UnprocessableEntity(
                "Changelog content must not be empty".into(),
            ));
        }
        if self.content.len() > CHANGELOG_MAX_LENGTH {
            return Err(AppError::UnprocessableEntity(format!(
                "Changelog content must be at most {CHANGELOG_MAX_LENGTH} characters"
            )));
        }
        Ok(())
    }
}
