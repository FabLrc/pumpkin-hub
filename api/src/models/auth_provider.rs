use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

/// Supported external authentication providers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthProviderKind {
    Github,
    Google,
    Discord,
}

impl AuthProviderKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthProviderKind::Github => "github",
            AuthProviderKind::Google => "google",
            AuthProviderKind::Discord => "discord",
        }
    }
}

impl TryFrom<&str> for AuthProviderKind {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "github" => Ok(AuthProviderKind::Github),
            "google" => Ok(AuthProviderKind::Google),
            "discord" => Ok(AuthProviderKind::Discord),
            other => Err(format!("Unknown auth provider: {other}")),
        }
    }
}

/// A linked OAuth provider for a user.
#[derive(Debug, Clone, FromRow)]
pub struct AuthProvider {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider: String,
    pub provider_id: String,
    pub created_at: DateTime<Utc>,
}
