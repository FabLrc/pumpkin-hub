use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use thiserror::Error;

#[derive(Debug, Clone)]
pub struct Config {
    pub server: ServerConfig,
    pub database_url: String,
    pub meilisearch: MeilisearchConfig,
    pub github: GithubConfig,
    pub google: Option<OAuthProviderConfig>,
    pub discord: Option<OAuthProviderConfig>,
    pub jwt: JwtConfig,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub address: SocketAddr,
    pub allowed_origins: Vec<String>,
    /// Publicly reachable base URL of this API (e.g. "http://localhost:8080").
    /// Used to construct self-referencing URLs stored in the database.
    pub api_public_url: String,
}

#[derive(Debug, Clone)]
pub struct MeilisearchConfig {
    pub url: String,
    pub master_key: String,
}

#[derive(Debug, Clone)]
pub struct GithubConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone)]
pub struct OAuthProviderConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone)]
pub struct JwtConfig {
    pub secret: String,
    /// Token time-to-live in seconds (default: 24h).
    pub ttl_seconds: u64,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingVar(String),
    #[error("Invalid value for '{key}': {reason}")]
    InvalidValue { key: String, reason: String },
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = parse_env_var::<u16>("SERVER_PORT", 8080)?;

        let ip: IpAddr = host.parse().map_err(|_| ConfigError::InvalidValue {
            key: "SERVER_HOST".to_string(),
            reason: format!("'{host}' is not a valid IP address"),
        })?;

        let allowed_origins = std::env::var("ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let api_public_url =
            std::env::var("API_PUBLIC_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());

        let database_url = require_env("DATABASE_URL")?;
        let meilisearch_url = require_env("MEILISEARCH_URL")?;
        let meilisearch_key = require_env("MEILISEARCH_KEY")?;

        let github_client_id = require_env("GITHUB_CLIENT_ID")?;
        let github_client_secret = require_env("GITHUB_CLIENT_SECRET")?;
        let github_redirect_uri = std::env::var("GITHUB_REDIRECT_URI")
            .unwrap_or_else(|_| "http://localhost:8080/api/v1/auth/github/callback".to_string());

        let google = load_oauth_provider(
            "GOOGLE",
            "http://localhost:8080/api/v1/auth/google/callback",
        )?;
        let discord = load_oauth_provider(
            "DISCORD",
            "http://localhost:8080/api/v1/auth/discord/callback",
        )?;

        let jwt_secret = require_env("JWT_SECRET")?;
        let jwt_ttl_seconds = parse_env_var::<u64>("JWT_TTL_SECONDS", 86400)?;

        Ok(Config {
            server: ServerConfig {
                address: SocketAddr::new(ip, port),
                allowed_origins,
                api_public_url,
            },
            database_url,
            meilisearch: MeilisearchConfig {
                url: meilisearch_url,
                master_key: meilisearch_key,
            },
            github: GithubConfig {
                client_id: github_client_id,
                client_secret: github_client_secret,
                redirect_uri: github_redirect_uri,
            },
            google,
            discord,
            jwt: JwtConfig {
                secret: jwt_secret,
                ttl_seconds: jwt_ttl_seconds,
            },
        })
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            server: ServerConfig {
                address: SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 8080),
                allowed_origins: vec!["http://localhost:3000".to_string()],
                api_public_url: "http://localhost:8080".to_string(),
            },
            database_url: String::new(),
            meilisearch: MeilisearchConfig {
                url: String::new(),
                master_key: String::new(),
            },
            github: GithubConfig {
                client_id: String::new(),
                client_secret: String::new(),
                redirect_uri: "http://localhost:8080/api/v1/auth/github/callback".to_string(),
            },
            google: None,
            discord: None,
            jwt: JwtConfig {
                secret: String::new(),
                ttl_seconds: 86400,
            },
        }
    }
}

/// Loads an optional OAuth provider config. Returns `None` if CLIENT_ID is not set.
fn load_oauth_provider(
    prefix: &str,
    default_redirect: &str,
) -> Result<Option<OAuthProviderConfig>, ConfigError> {
    let client_id_key = format!("{prefix}_CLIENT_ID");
    let client_id = match std::env::var(&client_id_key) {
        Ok(val) if !val.is_empty() => val,
        _ => return Ok(None),
    };

    let secret_key = format!("{prefix}_CLIENT_SECRET");
    let client_secret = require_env(&secret_key)?;

    let redirect_key = format!("{prefix}_REDIRECT_URI");
    let redirect_uri =
        std::env::var(&redirect_key).unwrap_or_else(|_| default_redirect.to_string());

    Ok(Some(OAuthProviderConfig {
        client_id,
        client_secret,
        redirect_uri,
    }))
}

fn require_env(key: &str) -> Result<String, ConfigError> {
    std::env::var(key).map_err(|_| ConfigError::MissingVar(key.to_string()))
}

fn parse_env_var<T>(key: &str, default: T) -> Result<T, ConfigError>
where
    T: std::str::FromStr + std::fmt::Display,
    T::Err: std::fmt::Display,
{
    match std::env::var(key) {
        Ok(raw) => raw.parse::<T>().map_err(|e| ConfigError::InvalidValue {
            key: key.to_string(),
            reason: e.to_string(),
        }),
        Err(_) => Ok(default),
    }
}
