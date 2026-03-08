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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> JwtConfig {
        JwtConfig {
            secret: "test-secret-key-for-unit-tests-only".to_string(),
            ttl_seconds: 3600,
        }
    }

    #[test]
    fn encode_then_decode_roundtrip() {
        let config = test_config();
        let user_id = Uuid::new_v4();

        let token = encode_token(&config, user_id, "testuser", "author").unwrap();
        let decoded = decode_token(&config, &token).unwrap();

        assert_eq!(decoded.claims.sub, user_id);
        assert_eq!(decoded.claims.username, "testuser");
        assert_eq!(decoded.claims.role, "author");
    }

    #[test]
    fn decode_with_wrong_secret_fails() {
        let config = test_config();
        let token = encode_token(&config, Uuid::new_v4(), "user", "author").unwrap();

        let wrong_config = JwtConfig {
            secret: "wrong-secret".to_string(),
            ttl_seconds: 3600,
        };

        assert!(decode_token(&wrong_config, &token).is_err());
    }

    #[test]
    fn decode_garbage_token_fails() {
        let config = test_config();
        assert!(decode_token(&config, "not.a.jwt").is_err());
    }

    #[test]
    fn expired_token_is_rejected() {
        let config = JwtConfig {
            secret: "test-secret".to_string(),
            ttl_seconds: 0, // expires immediately
        };
        let token = encode_token(&config, Uuid::new_v4(), "user", "author").unwrap();

        // Token was just created with exp = now + 0 = now, so it should be expired
        // jsonwebtoken has a leeway of 60s by default, so we need negative ttl
        // Instead, manually craft an expired token:
        let now = Utc::now().timestamp();
        let claims = Claims {
            sub: Uuid::new_v4(),
            username: "user".to_string(),
            role: "author".to_string(),
            iat: now - 7200,
            exp: now - 3600, // expired 1h ago
        };
        let expired_token = jsonwebtoken::encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(config.secret.as_bytes()),
        )
        .unwrap();

        assert!(decode_token(&config, &expired_token).is_err());
        // Also verify the first token is still OK (leeway allows it)
        let _ = token; // created with ttl=0 but leeway may allow it
    }

    #[test]
    fn claims_contain_correct_timestamps() {
        let config = test_config();
        let before = Utc::now().timestamp();
        let token = encode_token(&config, Uuid::new_v4(), "user", "author").unwrap();
        let after = Utc::now().timestamp();

        let decoded = decode_token(&config, &token).unwrap();
        assert!(decoded.claims.iat >= before);
        assert!(decoded.claims.iat <= after);
        assert_eq!(
            decoded.claims.exp,
            decoded.claims.iat + config.ttl_seconds as i64
        );
    }

    #[test]
    fn different_roles_are_preserved() {
        let config = test_config();

        for role in &["admin", "moderator", "author"] {
            let token = encode_token(&config, Uuid::new_v4(), "user", role).unwrap();
            let decoded = decode_token(&config, &token).unwrap();
            assert_eq!(decoded.claims.role, *role);
        }
    }
}
