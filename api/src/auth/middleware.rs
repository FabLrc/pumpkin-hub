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

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = extract_token(parts)?;

        let token_data =
            jwt::decode_token(&state.config.jwt, &token).map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            username: token_data.claims.username,
            role: token_data.claims.role,
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
