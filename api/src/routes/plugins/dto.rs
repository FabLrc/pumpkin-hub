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

const VERSION_MAX_LENGTH: usize = 50;
const CHANGELOG_MAX_LENGTH: usize = 50_000;
const ICON_MAX_SIZE_BYTES: u64 = 5 * 1024 * 1024;
const ALLOWED_ICON_CONTENT_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];

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
    pub icon_url: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<CategorySummary>,
    pub average_rating: f64,
    pub review_count: i64,
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
    pub icon_url: Option<String>,
    pub license: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<CategorySummary>,
    pub average_rating: f64,
    pub review_count: i64,
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

// ── Version DTOs ────────────────────────────────────────────────────────────

/// Single version entry returned by the versions endpoint.
#[derive(Debug, Serialize)]
pub struct VersionResponse {
    pub id: Uuid,
    pub version: String,
    pub changelog: Option<String>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
    pub downloads: i64,
    pub is_yanked: bool,
    pub published_at: DateTime<Utc>,
}

/// Aggregate response for all versions of a plugin.
#[derive(Debug, Serialize)]
pub struct VersionsListResponse {
    pub plugin_slug: String,
    pub total: usize,
    pub versions: Vec<VersionResponse>,
}

// ── Version Request DTOs ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateVersionRequest {
    pub version: String,
    pub changelog: Option<String>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
}

impl CreateVersionRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        validate_semver(&self.version, "version")?;
        validate_optional_length(&self.changelog, "changelog", CHANGELOG_MAX_LENGTH)?;
        // Pumpkin versions are not guaranteed to be semver (e.g. "nightly"),
        // so only validate length here.
        validate_optional_length(
            &self.pumpkin_version_min,
            "pumpkin_version_min",
            VERSION_MAX_LENGTH,
        )?;
        validate_optional_length(
            &self.pumpkin_version_max,
            "pumpkin_version_max",
            VERSION_MAX_LENGTH,
        )?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct YankVersionRequest {
    pub yanked: bool,
}

// ── Binary DTOs ─────────────────────────────────────────────────────────────

const FILE_NAME_MAX_LENGTH: usize = 255;

/// Allowed Content-Types for .wasm binary uploads.
/// Note: browsers may report application/octet-stream for .wasm files.
const ALLOWED_BINARY_CONTENT_TYPES: &[&str] = &["application/wasm", "application/octet-stream"];

/// Response DTO for a single binary artifact.
#[derive(Debug, Serialize)]
pub struct BinaryResponse {
    pub id: Uuid,
    pub file_name: String,
    pub file_size: i64,
    pub checksum_sha256: String,
    pub content_type: String,
    pub uploaded_at: DateTime<Utc>,
}

/// Response DTO for all binaries of a version.
#[derive(Debug, Serialize)]
pub struct BinariesListResponse {
    pub plugin_slug: String,
    pub version: String,
    pub total: usize,
    pub binaries: Vec<BinaryResponse>,
}

/// Response returned after a successful binary upload.
#[derive(Debug, Serialize)]
pub struct BinaryUploadResponse {
    pub binary: BinaryResponse,
    pub download_url: String,
}

/// Response returned with the pre-signed download URL.
#[derive(Debug, Serialize)]
pub struct BinaryDownloadResponse {
    pub download_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub checksum_sha256: String,
    pub expires_in_seconds: u64,
}

pub fn validate_icon_content_type(content_type: &str) -> Result<(), AppError> {
    if !ALLOWED_ICON_CONTENT_TYPES.contains(&content_type) {
        return Err(AppError::UnprocessableEntity(format!(
            "Unsupported icon media type '{content_type}'. Allowed: JPEG, PNG, WebP"
        )));
    }
    Ok(())
}

pub fn validate_icon_size(size: u64) -> Result<(), AppError> {
    if size > ICON_MAX_SIZE_BYTES {
        return Err(AppError::UnprocessableEntity(format!(
            "Icon file size ({size} bytes) exceeds maximum ({ICON_MAX_SIZE_BYTES} bytes)"
        )));
    }
    Ok(())
}

pub fn validate_binary_content_type(content_type: &str) -> Result<(), AppError> {
    if !ALLOWED_BINARY_CONTENT_TYPES.contains(&content_type) {
        return Err(AppError::UnprocessableEntity(format!(
            "Invalid content type '{content_type}'. Allowed: {}",
            ALLOWED_BINARY_CONTENT_TYPES.join(", ")
        )));
    }
    Ok(())
}

pub fn validate_file_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::UnprocessableEntity(
            "File name must not be empty".to_string(),
        ));
    }
    if name.len() > FILE_NAME_MAX_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "File name must be at most {FILE_NAME_MAX_LENGTH} characters"
        )));
    }
    // Reject path traversal attempts
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return Err(AppError::UnprocessableEntity(
            "File name must not contain path separators or '..'".to_string(),
        ));
    }
    Ok(())
}

// ── Validation Helpers ──────────────────────────────────────────────────────
fn validate_semver(value: &str, field_name: &str) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::UnprocessableEntity(format!(
            "{field_name} must not be empty"
        )));
    }
    if trimmed.len() > VERSION_MAX_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "{field_name} must be at most {VERSION_MAX_LENGTH} characters"
        )));
    }
    semver::Version::parse(trimmed).map_err(|_| {
        AppError::UnprocessableEntity(format!(
            "{field_name} must be a valid semantic version (e.g. 1.0.0)"
        ))
    })?;
    Ok(())
}

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

#[cfg(test)]
mod tests {
    use super::*;

    // ── CreatePluginRequest validation ──────────────────────────────────

    fn valid_create_request() -> CreatePluginRequest {
        CreatePluginRequest {
            name: "My Plugin".to_string(),
            short_description: None,
            description: None,
            repository_url: None,
            documentation_url: None,
            license: None,
            category_ids: None,
        }
    }

    #[test]
    fn create_valid_request_passes() {
        assert!(valid_create_request().validate().is_ok());
    }

    #[test]
    fn create_name_too_short() {
        let mut req = valid_create_request();
        req.name = "ab".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_name_too_long() {
        let mut req = valid_create_request();
        req.name = "a".repeat(101);
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_name_with_invalid_chars() {
        let mut req = valid_create_request();
        req.name = "plugin@name!".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_name_boundary_3_chars() {
        let mut req = valid_create_request();
        req.name = "abc".to_string();
        assert!(req.validate().is_ok());
    }

    #[test]
    fn create_name_boundary_100_chars() {
        let mut req = valid_create_request();
        req.name = "a".repeat(100);
        assert!(req.validate().is_ok());
    }

    #[test]
    fn create_name_allows_spaces_hyphens_underscores() {
        let mut req = valid_create_request();
        req.name = "My Plugin-Name_v2".to_string();
        assert!(req.validate().is_ok());
    }

    #[test]
    fn create_short_description_too_long() {
        let mut req = valid_create_request();
        req.short_description = Some("x".repeat(256));
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_description_too_long() {
        let mut req = valid_create_request();
        req.description = Some("x".repeat(50_001));
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_url_must_have_scheme() {
        let mut req = valid_create_request();
        req.repository_url = Some("example.com/repo".to_string());
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_url_with_https_is_valid() {
        let mut req = valid_create_request();
        req.repository_url = Some("https://github.com/user/repo".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn create_url_too_long() {
        let mut req = valid_create_request();
        req.repository_url = Some(format!("https://example.com/{}", "a".repeat(500)));
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_license_too_long() {
        let mut req = valid_create_request();
        req.license = Some("x".repeat(51));
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_too_many_categories() {
        let mut req = valid_create_request();
        req.category_ids = Some((0..6).map(|_| Uuid::new_v4()).collect());
        assert!(req.validate().is_err());
    }

    #[test]
    fn create_max_categories_is_ok() {
        let mut req = valid_create_request();
        req.category_ids = Some((0..5).map(|_| Uuid::new_v4()).collect());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn create_duplicate_categories_rejected() {
        let mut req = valid_create_request();
        let id = Uuid::new_v4();
        req.category_ids = Some(vec![id, id]);
        assert!(req.validate().is_err());
    }

    // ── UpdatePluginRequest validation ──────────────────────────────────

    #[test]
    fn update_empty_request_has_no_changes() {
        let req = UpdatePluginRequest {
            name: None,
            short_description: None,
            description: None,
            repository_url: None,
            documentation_url: None,
            license: None,
            category_ids: None,
        };
        assert!(!req.has_changes());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn update_with_valid_name_has_changes() {
        let req = UpdatePluginRequest {
            name: Some("New Name".to_string()),
            short_description: None,
            description: None,
            repository_url: None,
            documentation_url: None,
            license: None,
            category_ids: None,
        };
        assert!(req.has_changes());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn update_invalid_name_rejected() {
        let req = UpdatePluginRequest {
            name: Some("ab".to_string()),
            short_description: None,
            description: None,
            repository_url: None,
            documentation_url: None,
            license: None,
            category_ids: None,
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn update_invalid_url_rejected() {
        let req = UpdatePluginRequest {
            name: None,
            short_description: None,
            description: None,
            repository_url: Some("not-a-url".to_string()),
            documentation_url: None,
            license: None,
            category_ids: None,
        };
        assert!(req.validate().is_err());
    }

    // ── ListPluginsParams ───────────────────────────────────────────────

    #[test]
    fn defaults_applied_when_no_params() {
        let params = ListPluginsParams {
            page: None,
            per_page: None,
            sort_by: None,
            order: None,
            category: None,
            author: None,
        };
        assert_eq!(params.page(), 1);
        assert_eq!(params.per_page(), 20);
        assert_eq!(params.offset(), 0);
        assert_eq!(params.sort_column(), "p.created_at");
        assert_eq!(params.sort_direction(), "DESC");
    }

    #[test]
    fn page_zero_clamped_to_one() {
        let params = ListPluginsParams {
            page: Some(0),
            per_page: None,
            sort_by: None,
            order: None,
            category: None,
            author: None,
        };
        assert_eq!(params.page(), 1);
    }

    #[test]
    fn per_page_clamped_to_max() {
        let params = ListPluginsParams {
            page: None,
            per_page: Some(200),
            sort_by: None,
            order: None,
            category: None,
            author: None,
        };
        assert_eq!(params.per_page(), 100);
    }

    #[test]
    fn offset_calculation() {
        let params = ListPluginsParams {
            page: Some(3),
            per_page: Some(10),
            sort_by: None,
            order: None,
            category: None,
            author: None,
        };
        assert_eq!(params.offset(), 20);
    }

    #[test]
    fn sort_fields_map_to_columns() {
        assert_eq!(SortField::CreatedAt.as_column(), "p.created_at");
        assert_eq!(SortField::UpdatedAt.as_column(), "p.updated_at");
        assert_eq!(SortField::DownloadsTotal.as_column(), "p.downloads_total");
        assert_eq!(SortField::Name.as_column(), "p.name");
    }

    #[test]
    fn sort_order_maps_to_sql() {
        assert_eq!(SortOrder::Asc.as_sql(), "ASC");
        assert_eq!(SortOrder::Desc.as_sql(), "DESC");
    }

    // ── CreateVersionRequest validation ─────────────────────────────────

    fn valid_version_request() -> CreateVersionRequest {
        CreateVersionRequest {
            version: "1.0.0".to_string(),
            changelog: None,
            pumpkin_version_min: None,
            pumpkin_version_max: None,
        }
    }

    #[test]
    fn version_valid_request_passes() {
        assert!(valid_version_request().validate().is_ok());
    }

    #[test]
    fn version_with_changelog_passes() {
        let mut req = valid_version_request();
        req.changelog = Some("## Changes\n- Fixed a bug".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_with_pumpkin_range_passes() {
        let mut req = valid_version_request();
        req.pumpkin_version_min = Some("0.1.0".to_string());
        req.pumpkin_version_max = Some("1.0.0".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_invalid_semver_rejected() {
        let mut req = valid_version_request();
        req.version = "not-a-version".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn version_empty_string_rejected() {
        let mut req = valid_version_request();
        req.version = "".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn version_v_prefix_rejected() {
        let mut req = valid_version_request();
        req.version = "v1.0.0".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn version_partial_semver_rejected() {
        let mut req = valid_version_request();
        req.version = "1.0".to_string();
        assert!(req.validate().is_err());
    }

    #[test]
    fn version_prerelease_passes() {
        let mut req = valid_version_request();
        req.version = "1.0.0-alpha.1".to_string();
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_build_metadata_passes() {
        let mut req = valid_version_request();
        req.version = "1.0.0+build.42".to_string();
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_non_semver_pumpkin_min_accepted() {
        // Pumpkin uses non-semver identifiers (e.g. "nightly"), so any
        // non-empty string within the length limit is valid.
        let mut req = valid_version_request();
        req.pumpkin_version_min = Some("nightly".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_non_semver_pumpkin_max_accepted() {
        let mut req = valid_version_request();
        req.pumpkin_version_max = Some("nightly".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_pumpkin_range_no_order_constraint() {
        // Range ordering is not enforced server-side; values come from
        // a controlled dropdown on the frontend.
        let mut req = valid_version_request();
        req.pumpkin_version_min = Some("2.0.0".to_string());
        req.pumpkin_version_max = Some("1.0.0".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_min_equals_max_passes() {
        let mut req = valid_version_request();
        req.pumpkin_version_min = Some("1.0.0".to_string());
        req.pumpkin_version_max = Some("1.0.0".to_string());
        assert!(req.validate().is_ok());
    }

    #[test]
    fn version_changelog_too_long_rejected() {
        let mut req = valid_version_request();
        req.changelog = Some("x".repeat(50_001));
        assert!(req.validate().is_err());
    }

    #[test]
    fn version_string_too_long_rejected() {
        let mut req = valid_version_request();
        req.version = format!("1.0.0-{}", "a".repeat(50));
        assert!(req.validate().is_err());
    }
}
