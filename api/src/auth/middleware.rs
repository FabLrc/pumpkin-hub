use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::CookieJar;
use sha2::{Digest, Sha256};

use crate::{auth::jwt, error::AppError, state::AppState};

/// Name of the cookie holding the JWT token.
pub const AUTH_COOKIE_NAME: &str = "pumpkin_hub_token";

/// Header name for API key authentication.
const API_KEY_HEADER: &str = "x-api-key";

/// Extractor that validates authentication from:
/// 1. JWT cookie (`pumpkin_hub_token`)
/// 2. `Authorization: Bearer <jwt>` header
/// 3. `X-API-Key: phub_...` header
pub struct AuthUser {
    pub user_id: uuid::Uuid,
    pub username: String,
    pub role: String,
}

impl AuthUser {
    /// Returns `Ok(())` if the user has the `admin` or `moderator` role.
    pub fn require_staff(&self) -> Result<(), AppError> {
        if self.role == "admin" || self.role == "moderator" {
            Ok(())
        } else {
            Err(AppError::Forbidden)
        }
    }

    /// Returns `Ok(())` if the user has the `admin` role.
    pub fn require_admin(&self) -> Result<(), AppError> {
        if self.role == "admin" {
            Ok(())
        } else {
            Err(AppError::Forbidden)
        }
    }
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Try API key first (X-API-Key header)
        if let Some(api_key) = extract_api_key(parts) {
            return resolve_api_key(&api_key, state).await;
        }

        // Fall back to JWT (cookie or Authorization header)
        let token = extract_token(parts)?;

        let token_data =
            jwt::decode_token(&state.config.jwt, &token).map_err(|_| AppError::Unauthorized)?;

        // Fetch role and active status fresh from the DB on every request.
        // This ensures role changes and account bans take effect immediately,
        // without waiting for the JWT to expire.
        let row: Option<(String, bool)> =
            sqlx::query_as("SELECT role, is_active FROM users WHERE id = $1")
                .bind(token_data.claims.sub)
                .fetch_optional(&state.db)
                .await
                .map_err(AppError::internal)?;

        let (role, is_active) = row.ok_or(AppError::Unauthorized)?;

        if !is_active {
            return Err(AppError::Unauthorized);
        }

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            username: token_data.claims.username,
            role,
        })
    }
}

/// Tries to extract a JWT token from (1) cookies, then (2) Authorization header.
fn extract_token(parts: &Parts) -> Result<String, AppError> {
    // 1. Try the HttpOnly cookie first
    let jar = CookieJar::from_headers(&parts.headers);
    if let Some(cookie) = jar.get(AUTH_COOKIE_NAME) {
        let value = cookie.value();
        if !value.is_empty() {
            return Ok(value.to_string());
        }
    }

    // 2. Fall back to Authorization: Bearer <token>
    if let Some(auth_header) = parts.headers.get(axum::http::header::AUTHORIZATION) {
        let header_value = auth_header.to_str().map_err(|_| AppError::Unauthorized)?;
        if let Some(token) = header_value.strip_prefix("Bearer ") {
            let token = token.trim();
            if !token.is_empty() {
                return Ok(token.to_string());
            }
        }
    }

    Err(AppError::Unauthorized)
}

/// Extracts the API key from the `X-API-Key` header if present and prefixed with `phub_`.
fn extract_api_key(parts: &Parts) -> Option<String> {
    let value = parts.headers.get(API_KEY_HEADER)?.to_str().ok()?;
    let trimmed = value.trim();
    if trimmed.starts_with("phub_") && trimmed.len() > 10 {
        Some(trimmed.to_string())
    } else {
        None
    }
}

/// Resolves an API key to an `AuthUser` by hashing it and looking it up in the DB.
async fn resolve_api_key(raw_key: &str, state: &AppState) -> Result<AuthUser, AppError> {
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    let row: Option<(
        uuid::Uuid,
        uuid::Uuid,
        Option<chrono::DateTime<chrono::Utc>>,
    )> = sqlx::query_as("SELECT id, user_id, expires_at FROM api_keys WHERE key_hash = $1")
        .bind(&key_hash)
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::internal)?;

    let (api_key_id, user_id, expires_at) = row.ok_or(AppError::Unauthorized)?;

    // Check expiration
    if let Some(exp) = expires_at {
        if exp < chrono::Utc::now() {
            return Err(AppError::Unauthorized);
        }
    }

    // Fetch user info
    let user_row: Option<(String, String, bool)> =
        sqlx::query_as("SELECT username, role, is_active FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&state.db)
            .await
            .map_err(AppError::internal)?;

    let (username, role, is_active) = user_row.ok_or(AppError::Unauthorized)?;

    if !is_active {
        return Err(AppError::Unauthorized);
    }

    // Update last_used_at (fire-and-forget — don't block the request)
    let db = state.db.clone();
    tokio::spawn(async move {
        let _ = sqlx::query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1")
            .bind(api_key_id)
            .execute(&db)
            .await;
    });

    Ok(AuthUser {
        user_id,
        username,
        role,
    })
}
