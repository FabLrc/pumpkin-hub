use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Validation Constants ────────────────────────────────────────────────────

const CAPTION_MAX_LENGTH: usize = 500;

/// Maximum total media items per plugin.
const MAX_MEDIA_PER_PLUGIN: i64 = 20;

/// Maximum file size for images: 10 MB.
const IMAGE_MAX_SIZE_BYTES: u64 = 10 * 1024 * 1024;

/// Maximum file size for videos: 100 MB.
const VIDEO_MAX_SIZE_BYTES: u64 = 100 * 1024 * 1024;

/// Allowed image MIME types.
const ALLOWED_IMAGE_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];

/// Allowed video MIME types.
const ALLOWED_VIDEO_TYPES: &[&str] = &["video/mp4", "video/webm"];

// ── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MediaResponse {
    pub id: Uuid,
    pub media_type: String,
    pub file_name: String,
    pub file_size: i64,
    pub content_type: String,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub caption: Option<String>,
    pub sort_order: i32,
    pub uploaded_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MediaListResponse {
    pub plugin_slug: String,
    pub total: i64,
    pub media: Vec<MediaResponse>,
}

#[derive(Debug, Serialize)]
pub struct MediaUploadResponse {
    pub media: MediaResponse,
}

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UpdateMediaRequest {
    pub caption: Option<String>,
    pub sort_order: Option<i32>,
}

impl UpdateMediaRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref caption) = self.caption {
            if caption.len() > CAPTION_MAX_LENGTH {
                return Err(AppError::UnprocessableEntity(format!(
                    "Caption must be at most {CAPTION_MAX_LENGTH} characters"
                )));
            }
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct ReorderMediaRequest {
    /// Ordered list of media IDs defining the new sort order.
    pub media_ids: Vec<Uuid>,
}

// ── Validation Functions ────────────────────────────────────────────────────

pub fn max_media_per_plugin() -> i64 {
    MAX_MEDIA_PER_PLUGIN
}

/// Validates the content type and returns the media type ("image" or "video").
pub fn validate_media_content_type(content_type: &str) -> Result<&'static str, AppError> {
    if ALLOWED_IMAGE_TYPES.contains(&content_type) {
        return Ok("image");
    }
    if ALLOWED_VIDEO_TYPES.contains(&content_type) {
        return Ok("video");
    }
    Err(AppError::UnprocessableEntity(format!(
        "Unsupported media type '{content_type}'. Allowed: JPEG, PNG, WebP images; MP4, WebM videos"
    )))
}

/// Validates that the file size is within bounds for its media type.
pub fn validate_media_size(size: u64, media_type: &str) -> Result<(), AppError> {
    let max = match media_type {
        "image" => IMAGE_MAX_SIZE_BYTES,
        "video" => VIDEO_MAX_SIZE_BYTES,
        _ => return Err(AppError::UnprocessableEntity("Invalid media type".into())),
    };
    if size > max {
        return Err(AppError::UnprocessableEntity(format!(
            "File size ({size} bytes) exceeds maximum for {media_type} ({max} bytes)"
        )));
    }
    Ok(())
}

/// Validates the file name (no path traversal, reasonable length).
pub fn validate_media_file_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() || name.len() > 255 {
        return Err(AppError::UnprocessableEntity(
            "File name must be between 1 and 255 characters".into(),
        ));
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return Err(AppError::UnprocessableEntity(
            "File name contains invalid characters".into(),
        ));
    }
    Ok(())
}
