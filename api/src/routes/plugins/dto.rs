use std::collections::HashSet;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Validation Constants ────────────────────────────────────────────────────

const NAME_MIN_LENGTH: usize = 3;
const NAME_MAX_LENGTH: usize = 100;
const SHORT_DESCRIPTION_MAX_LENGTH: usize = 255;
const DESCRIPTION_MAX_LENGTH: usize = 50_000;
const LICENSE_MAX_LENGTH: usize = 50;
const URL_MAX_LENGTH: usize = 500;
const MAX_CATEGORIES_PER_PLUGIN: usize = 5;

const DEFAULT_PAGE: u32 = 1;
const DEFAULT_PER_PAGE: u32 = 20;
const MAX_PER_PAGE: u32 = 100;

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreatePluginRequest {
    pub name: String,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub repository_url: Option<String>,
    pub documentation_url: Option<String>,
    pub license: Option<String>,
    pub category_ids: Option<Vec<Uuid>>,
}

impl CreatePluginRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        validate_name(&self.name)?;
        validate_optional_length(
            &self.short_description,
            "short_description",
            SHORT_DESCRIPTION_MAX_LENGTH,
        )?;
        validate_optional_length(&self.description, "description", DESCRIPTION_MAX_LENGTH)?;
        validate_optional_url(&self.repository_url, "repository_url")?;
        validate_optional_url(&self.documentation_url, "documentation_url")?;
        validate_optional_length(&self.license, "license", LICENSE_MAX_LENGTH)?;
        validate_category_ids(&self.category_ids)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdatePluginRequest {
    pub name: Option<String>,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub repository_url: Option<String>,
    pub documentation_url: Option<String>,
    pub license: Option<String>,
    pub category_ids: Option<Vec<Uuid>>,
}

impl UpdatePluginRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref name) = self.name {
            validate_name(name)?;
        }
        validate_optional_length(
            &self.short_description,
            "short_description",
            SHORT_DESCRIPTION_MAX_LENGTH,
        )?;
        validate_optional_length(&self.description, "description", DESCRIPTION_MAX_LENGTH)?;
        validate_optional_url(&self.repository_url, "repository_url")?;
        validate_optional_url(&self.documentation_url, "documentation_url")?;
        validate_optional_length(&self.license, "license", LICENSE_MAX_LENGTH)?;
        validate_category_ids(&self.category_ids)?;
        Ok(())
    }

    pub fn has_changes(&self) -> bool {
        self.name.is_some()
            || self.short_description.is_some()
            || self.description.is_some()
            || self.repository_url.is_some()
            || self.documentation_url.is_some()
            || self.license.is_some()
            || self.category_ids.is_some()
    }
}

// ── Query Parameters ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ListPluginsParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub sort_by: Option<SortField>,
    pub order: Option<SortOrder>,
    pub category: Option<String>,
    pub author: Option<String>,
}

impl ListPluginsParams {
    pub fn page(&self) -> u32 {
        self.page.unwrap_or(DEFAULT_PAGE).max(1)
    }

    pub fn per_page(&self) -> u32 {
        self.per_page
            .unwrap_or(DEFAULT_PER_PAGE)
            .clamp(1, MAX_PER_PAGE)
    }

    pub fn offset(&self) -> u32 {
        (self.page() - 1) * self.per_page()
    }

    /// Returns a safe SQL column expression (table-prefixed, validated via enum).
    pub fn sort_column(&self) -> &'static str {
        self.sort_by
            .as_ref()
            .map_or("p.created_at", SortField::as_column)
    }

    /// Returns a safe SQL direction keyword (validated via enum).
    pub fn sort_direction(&self) -> &'static str {
        self.order.as_ref().map_or("DESC", SortOrder::as_sql)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortField {
    CreatedAt,
    UpdatedAt,
    DownloadsTotal,
    Name,
}

impl SortField {
    pub fn as_column(&self) -> &'static str {
        match self {
            SortField::CreatedAt => "p.created_at",
            SortField::UpdatedAt => "p.updated_at",
            SortField::DownloadsTotal => "p.downloads_total",
            SortField::Name => "p.name",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    Asc,
    Desc,
}

impl SortOrder {
    pub fn as_sql(&self) -> &'static str {
        match self {
            SortOrder::Asc => "ASC",
            SortOrder::Desc => "DESC",
        }
    }
}

// ── Response DTOs ───────────────────────────────────────────────────────────

/// Full plugin detail (used for single-resource responses).
#[derive(Debug, Serialize)]
pub struct PluginResponse {
    pub id: Uuid,
    pub author: AuthorSummary,
    pub name: String,
    pub slug: String,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub repository_url: Option<String>,
    pub documentation_url: Option<String>,
    pub license: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<CategorySummary>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Compact plugin representation for list views (no full description).
#[derive(Debug, Serialize)]
pub struct PluginSummary {
    pub id: Uuid,
    pub author: AuthorSummary,
    pub name: String,
    pub slug: String,
    pub short_description: Option<String>,
    pub license: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<CategorySummary>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AuthorSummary {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CategorySummary {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
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

// ── Validation Helpers ──────────────────────────────────────────────────────

fn validate_name(name: &str) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.len() < NAME_MIN_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "Name must be at least {NAME_MIN_LENGTH} characters"
        )));
    }
    if trimmed.len() > NAME_MAX_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "Name must be at most {NAME_MAX_LENGTH} characters"
        )));
    }
    if !trimmed
        .chars()
        .all(|c| c.is_alphanumeric() || " -_".contains(c))
    {
        return Err(AppError::UnprocessableEntity(
            "Name must contain only alphanumeric characters, spaces, hyphens or underscores"
                .to_string(),
        ));
    }
    Ok(())
}

fn validate_optional_length(
    value: &Option<String>,
    field_name: &str,
    max_length: usize,
) -> Result<(), AppError> {
    if let Some(ref v) = value {
        if v.len() > max_length {
            return Err(AppError::UnprocessableEntity(format!(
                "{field_name} must be at most {max_length} characters"
            )));
        }
    }
    Ok(())
}

fn validate_optional_url(value: &Option<String>, field_name: &str) -> Result<(), AppError> {
    if let Some(ref url) = value {
        if url.len() > URL_MAX_LENGTH {
            return Err(AppError::UnprocessableEntity(format!(
                "{field_name} must be at most {URL_MAX_LENGTH} characters"
            )));
        }
        if !url.starts_with("https://") && !url.starts_with("http://") {
            return Err(AppError::UnprocessableEntity(format!(
                "{field_name} must be a valid URL starting with http:// or https://"
            )));
        }
    }
    Ok(())
}

fn validate_category_ids(ids: &Option<Vec<Uuid>>) -> Result<(), AppError> {
    if let Some(ref ids) = ids {
        if ids.len() > MAX_CATEGORIES_PER_PLUGIN {
            return Err(AppError::UnprocessableEntity(format!(
                "A plugin can have at most {MAX_CATEGORIES_PER_PLUGIN} categories"
            )));
        }
        let unique_count = ids.iter().collect::<HashSet<_>>().len();
        if unique_count != ids.len() {
            return Err(AppError::UnprocessableEntity(
                "Duplicate category IDs are not allowed".to_string(),
            ));
        }
    }
    Ok(())
}
