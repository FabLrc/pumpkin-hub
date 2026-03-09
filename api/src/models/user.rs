use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Admin,
    Moderator,
    Author,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Admin => "admin",
            UserRole::Moderator => "moderator",
            UserRole::Author => "author",
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl TryFrom<&str> for UserRole {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "admin" => Ok(UserRole::Admin),
            "moderator" => Ok(UserRole::Moderator),
            "author" => Ok(UserRole::Author),
            other => Err(format!("Unknown user role: {other}")),
        }
    }
}

/// Represents a registered user. May be linked to multiple auth providers.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub github_id: Option<i64>,
    pub username: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub password_hash: Option<String>,
    pub email_verified: bool,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    pub fn parsed_role(&self) -> Result<UserRole, String> {
        UserRole::try_from(self.role.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn role_roundtrip() {
        for (input, expected) in [
            ("admin", UserRole::Admin),
            ("moderator", UserRole::Moderator),
            ("author", UserRole::Author),
        ] {
            let role = UserRole::try_from(input).unwrap();
            assert_eq!(role, expected);
            assert_eq!(role.as_str(), input);
        }
    }

    #[test]
    fn unknown_role_fails() {
        assert!(UserRole::try_from("superadmin").is_err());
    }

    #[test]
    fn display_matches_as_str() {
        assert_eq!(format!("{}", UserRole::Admin), "admin");
        assert_eq!(format!("{}", UserRole::Moderator), "moderator");
        assert_eq!(format!("{}", UserRole::Author), "author");
    }
}
