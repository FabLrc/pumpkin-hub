use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Validation Constants ────────────────────────────────────────────────────

const VERSION_REQ_MAX_LENGTH: usize = 100;

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct DeclareDepdendencyRequest {
    pub dependency_plugin_id: Uuid,
    pub version_req: String,
    #[serde(default)]
    pub is_optional: bool,
}

impl DeclareDepdendencyRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        validate_version_req(&self.version_req)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateDependencyRequest {
    pub version_req: Option<String>,
    pub is_optional: Option<bool>,
}

impl UpdateDependencyRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref req) = self.version_req {
            validate_version_req(req)?;
        }
        Ok(())
    }
}

// ── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DependencyResponse {
    pub id: Uuid,
    pub dependency_plugin: DependencyPluginSummary,
    pub version_req: String,
    pub is_optional: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DependencyPluginSummary {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize)]
pub struct DependencyListResponse {
    pub plugin_slug: String,
    pub version: String,
    pub total: usize,
    pub dependencies: Vec<DependencyResponse>,
}

/// A node in the full dependency graph.
#[derive(Debug, Serialize)]
pub struct DependencyGraphNode {
    pub plugin_id: Uuid,
    pub plugin_name: String,
    pub plugin_slug: String,
    pub version: String,
    pub version_id: Uuid,
    pub dependencies: Vec<DependencyGraphEdge>,
}

/// An edge in the dependency graph.
#[derive(Debug, Serialize)]
pub struct DependencyGraphEdge {
    pub dependency_plugin_id: Uuid,
    pub dependency_plugin_name: String,
    pub dependency_plugin_slug: String,
    pub version_req: String,
    pub is_optional: bool,
    pub resolved_version: Option<String>,
    pub is_compatible: bool,
}

#[derive(Debug, Serialize)]
pub struct DependencyGraphResponse {
    pub plugin_slug: String,
    pub version: String,
    pub graph: Vec<DependencyGraphNode>,
    pub conflicts: Vec<DependencyConflict>,
}

/// A detected conflict in the dependency graph.
#[derive(Debug, Serialize)]
pub struct DependencyConflict {
    pub dependency_plugin_id: Uuid,
    pub dependency_plugin_name: String,
    pub dependency_plugin_slug: String,
    pub conflict_type: ConflictType,
    pub details: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictType {
    /// No published version satisfies the requirement.
    NoMatchingVersion,
    /// Multiple dependants require incompatible version ranges.
    IncompatibleRanges,
    /// A dependency forms a cycle.
    CircularDependency,
    /// The required plugin is inactive / deleted.
    InactivePlugin,
}

/// Reverse-dependency lookup: "who depends on this plugin?"
#[derive(Debug, Serialize)]
pub struct ReverseDependencyResponse {
    pub plugin_slug: String,
    pub total: usize,
    pub dependants: Vec<ReverseDependant>,
}

#[derive(Debug, Serialize)]
pub struct ReverseDependant {
    pub plugin_id: Uuid,
    pub plugin_name: String,
    pub plugin_slug: String,
    pub version: String,
    pub version_req: String,
    pub is_optional: bool,
}

// ── Validation Helpers ──────────────────────────────────────────────────────

fn validate_version_req(version_req: &str) -> Result<(), AppError> {
    let trimmed = version_req.trim();
    if trimmed.is_empty() {
        return Err(AppError::UnprocessableEntity(
            "version_req must not be empty".to_string(),
        ));
    }
    if trimmed.len() > VERSION_REQ_MAX_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "version_req must be at most {VERSION_REQ_MAX_LENGTH} characters"
        )));
    }
    // Validate that it's a valid semver requirement (e.g. ">=1.0.0, <2.0.0")
    semver::VersionReq::parse(trimmed).map_err(|_| {
        AppError::UnprocessableEntity(format!(
            "version_req must be a valid semver requirement (e.g. '>=1.0.0, <2.0.0' or '^1.2.3'). Got: '{trimmed}'"
        ))
    })?;
    Ok(())
}
