use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::CookieJar;

use crate::{auth::jwt, error::AppError, state::AppState};

/// Name of the cookie holding the JWT token.
pub const AUTH_COOKIE_NAME: &str = "pumpkin_hub_token";

/// Extractor that validates the JWT from cookies or `Authorization: Bearer` header.
/// Inject as a handler parameter to protect a route.
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
