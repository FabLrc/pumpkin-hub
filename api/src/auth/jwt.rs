use chrono::Utc;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::JwtConfig;

/// JWT claims embedded in every access token.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject — the user's UUID.
    pub sub: Uuid,
    /// GitHub username (informational, not authoritative).
    pub username: String,
    /// User role at token-issue time.
    pub role: String,
    /// Issued-at (Unix timestamp).
    pub iat: i64,
    /// Expiration (Unix timestamp).
    pub exp: i64,
}

/// Creates a signed JWT for the given user.
pub fn encode_token(
    config: &JwtConfig,
    user_id: Uuid,
    username: &str,
    role: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now().timestamp();

    let claims = Claims {
        sub: user_id,
        username: username.to_string(),
        role: role.to_string(),
        iat: now,
        exp: now + config.ttl_seconds as i64,
    };

    jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.secret.as_bytes()),
    )
}

/// Validates and decodes a JWT, returning the embedded claims.
pub fn decode_token(
    config: &JwtConfig,
    token: &str,
) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.secret.as_bytes()),
        &Validation::default(),
    )
}
