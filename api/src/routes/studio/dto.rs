use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Constants ─────────────────────────────────────────────────────────────────

const NAME_MAX_LENGTH: usize = 100;
const DESCRIPTION_MAX_LENGTH: usize = 1000;

// ── Request DTOs ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
}

impl CreateProjectRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        let trimmed = self.name.trim();
        if trimmed.is_empty() {
            return Err(AppError::UnprocessableEntity("name cannot be empty".into()));
        }
        if trimmed.len() > NAME_MAX_LENGTH {
            return Err(AppError::UnprocessableEntity(format!(
                "name exceeds maximum length of {NAME_MAX_LENGTH} characters"
            )));
        }
        if let Some(ref desc) = self.description {
            if desc.len() > DESCRIPTION_MAX_LENGTH {
                return Err(AppError::UnprocessableEntity(format!(
                    "description exceeds maximum length of {DESCRIPTION_MAX_LENGTH} characters"
                )));
            }
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub flow_data: Option<serde_json::Value>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
}

impl UpdateProjectRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref name) = self.name {
            let trimmed = name.trim();
            if trimmed.is_empty() {
                return Err(AppError::UnprocessableEntity("name cannot be empty".into()));
            }
            if trimmed.len() > NAME_MAX_LENGTH {
                return Err(AppError::UnprocessableEntity(format!(
                    "name exceeds maximum length of {NAME_MAX_LENGTH} characters"
                )));
            }
        }
        if let Some(ref desc) = self.description {
            if desc.len() > DESCRIPTION_MAX_LENGTH {
                return Err(AppError::UnprocessableEntity(format!(
                    "description exceeds maximum length of {DESCRIPTION_MAX_LENGTH} characters"
                )));
            }
        }
        Ok(())
    }
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct TriggerBuildRequest {
    pub pumpkin_version: Option<String>,
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct NodeDefinition {
    pub node_id: String,
    pub category: String,
    pub label: String,
    pub color: String,
    pub description: Option<String>,
    pub parameters: Vec<NodeParameter>,
    pub outputs: Vec<OutputDefinition>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NodeParameter {
    pub id: String,
    pub label: String,
    pub param_type: String,
    pub options: Option<Vec<String>>,
    pub required: bool,
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OutputDefinition {
    pub id: String,
    pub label: String,
    pub output_type: String,
}

#[derive(Debug, Serialize)]
pub struct NodeRegistryResponse {
    pub nodes: Vec<NodeDefinition>,
    pub snapshot_hash: String,
    pub fetched_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub status: String,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
    pub latest_build_id: Option<Uuid>,
    pub build_count: i32,
    pub published_plugin_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ProjectListResponse {
    pub projects: Vec<ProjectSummary>,
}

#[derive(Debug, Serialize)]
pub struct ProjectDetailResponse {
    pub project: ProjectSummary,
    pub flow_data: serde_json::Value,
    pub wit_snapshot_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BuildResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub build_number: i32,
    pub status: String,
    pub logs: Option<String>,
    pub artifact_checksum_sha256: Option<String>,
    pub artifact_file_size: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct PublishDataResponse {
    pub project_name: String,
    pub project_slug: String,
    pub description: Option<String>,
    pub build_id: Uuid,
    pub download_url: String,
    pub checksum_sha256: String,
    pub file_size: i64,
}

#[derive(Debug, Serialize)]
pub struct TriggerBuildResponse {
    pub build_id: Uuid,
    pub status: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct EmptyResponse;
