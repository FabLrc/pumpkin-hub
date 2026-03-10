use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Validation Constants ────────────────────────────────────────────────────

const TITLE_MAX_LENGTH: usize = 150;
const BODY_MAX_LENGTH: usize = 5_000;
const REPORT_DETAILS_MAX_LENGTH: usize = 1_000;

const DEFAULT_PAGE: u32 = 1;
const DEFAULT_PER_PAGE: u32 = 20;
const MAX_PER_PAGE: u32 = 50;

const VALID_REPORT_REASONS: &[&str] = &[
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "other",
];

// ── Review DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateReviewRequest {
    pub rating: i16,
    pub title: Option<String>,
    pub body: Option<String>,
}

impl CreateReviewRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if !(1..=5).contains(&self.rating) {
            return Err(AppError::UnprocessableEntity(
                "rating must be between 1 and 5".into(),
            ));
        }
        validate_optional_length(&self.title, "title", TITLE_MAX_LENGTH)?;
        validate_optional_length(&self.body, "body", BODY_MAX_LENGTH)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateReviewRequest {
    pub rating: Option<i16>,
    pub title: Option<String>,
    pub body: Option<String>,
}

impl UpdateReviewRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(rating) = self.rating {
            if !(1..=5).contains(&rating) {
                return Err(AppError::UnprocessableEntity(
                    "rating must be between 1 and 5".into(),
                ));
            }
        }
        validate_optional_length(&self.title, "title", TITLE_MAX_LENGTH)?;
        validate_optional_length(&self.body, "body", BODY_MAX_LENGTH)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct ListReviewsParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl ListReviewsParams {
    pub fn page(&self) -> u32 {
        self.page.unwrap_or(DEFAULT_PAGE).max(1)
    }

    pub fn per_page(&self) -> u32 {
        self.per_page
            .unwrap_or(DEFAULT_PER_PAGE)
            .clamp(1, MAX_PER_PAGE)
    }
}

// ── Review Response DTOs ────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ReviewAuthorSummary {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReviewResponse {
    pub id: Uuid,
    pub plugin_id: Uuid,
    pub author: ReviewAuthorSummary,
    pub rating: i16,
    pub title: Option<String>,
    pub body: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ReviewListResponse {
    pub reviews: Vec<ReviewResponse>,
    pub total: i64,
    pub average_rating: f64,
    pub rating_distribution: RatingDistribution,
}

#[derive(Debug, Serialize)]
pub struct RatingDistribution {
    pub star_1: i64,
    pub star_2: i64,
    pub star_3: i64,
    pub star_4: i64,
    pub star_5: i64,
}

// ── Report DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateReportRequest {
    pub reason: String,
    pub details: Option<String>,
}

impl CreateReportRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if !VALID_REPORT_REASONS.contains(&self.reason.as_str()) {
            return Err(AppError::UnprocessableEntity(format!(
                "reason must be one of: {}",
                VALID_REPORT_REASONS.join(", ")
            )));
        }
        validate_optional_length(&self.details, "details", REPORT_DETAILS_MAX_LENGTH)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct ResolveReportRequest {
    pub status: String,
}

impl ResolveReportRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if !["dismissed", "action_taken"].contains(&self.status.as_str()) {
            return Err(AppError::UnprocessableEntity(
                "status must be 'dismissed' or 'action_taken'".into(),
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ReportResponse {
    pub id: Uuid,
    pub review_id: Uuid,
    pub reporter_id: Uuid,
    pub reason: String,
    pub details: Option<String>,
    pub status: String,
    pub resolved_by: Option<Uuid>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListReportsParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub status: Option<String>,
}

impl ListReportsParams {
    pub fn page(&self) -> u32 {
        self.page.unwrap_or(DEFAULT_PAGE).max(1)
    }

    pub fn per_page(&self) -> u32 {
        self.per_page
            .unwrap_or(DEFAULT_PER_PAGE)
            .clamp(1, MAX_PER_PAGE)
    }
}

#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub reports: Vec<ReportResponse>,
    pub total: i64,
}

// ── Validation Helpers ──────────────────────────────────────────────────────

fn validate_optional_length(
    value: &Option<String>,
    field_name: &str,
    max_length: usize,
) -> Result<(), AppError> {
    if let Some(v) = value {
        if v.len() > max_length {
            return Err(AppError::UnprocessableEntity(format!(
                "{field_name} must be at most {max_length} characters"
            )));
        }
    }
    Ok(())
}
