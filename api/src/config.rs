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
    pub s3: S3Config,
    pub binary_max_size_bytes: u64,
    pub rate_limit: RateLimitConfig,
    pub smtp: Option<SmtpConfig>,
    pub github_app: Option<GitHubAppConfig>,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub address: SocketAddr,
    pub allowed_origins: Vec<String>,
    /// Publicly reachable base URL of this API (e.g. "http://localhost:8080").
    /// Used to construct self-referencing URLs stored in the database.
    pub api_public_url: String,
    /// Whether cookies should be marked `Secure` (HTTPS-only).
    /// Auto-detected from `COOKIE_SECURE` env or inferred from `ALLOWED_ORIGINS`.
    pub secure_cookies: bool,
    /// Optional cookie domain (e.g. `.pumpkinhub.org`).
    /// Set this when the frontend and API are on different subdomains so the
    /// auth cookie is accessible to the Next.js upload proxy.
    pub cookie_domain: Option<String>,
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

#[derive(Debug, Clone)]
pub struct S3Config {
    pub endpoint_url: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    /// Use path-style addressing (required for MinIO, false for R2).
    pub force_path_style: bool,
    /// Browser-reachable base URL for pre-signed download links.
    /// When set, replaces the internal `endpoint_url` in generated URLs.
    /// Example: "http://localhost:9000" in dev, the R2 public URL in prod.
    pub public_url: Option<String>,
    /// When true, serve objects via direct public URLs instead of presigned URLs.
    /// Use this when the bucket has anonymous download access (e.g. MinIO dev, R2 public bucket).
    pub use_direct_public_urls: bool,
}

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Replenish interval in seconds for general API routes.
    pub general_per_second: u64,
    /// Burst size for general API routes.
    pub general_burst_size: u32,
    /// Replenish interval in seconds for auth routes (stricter).
    pub auth_per_second: u64,
    /// Burst size for auth routes (stricter).
    pub auth_burst_size: u32,
}

#[derive(Debug, Clone)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub from_address: String,
}

#[derive(Debug, Clone)]
pub struct GitHubAppConfig {
    pub app_id: String,
    pub private_key: String,
    pub webhook_secret: String,
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

        let allowed_origins: Vec<String> = std::env::var("ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let api_public_url =
            std::env::var("API_PUBLIC_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());

        let secure_cookies = match std::env::var("COOKIE_SECURE") {
            Ok(val) => val.parse::<bool>().unwrap_or(true),
            Err(_) => allowed_origins.iter().any(|o| o.starts_with("https://")),
        };

        let cookie_domain = std::env::var("COOKIE_DOMAIN")
            .ok()
            .filter(|s| !s.is_empty());

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

        let s3_endpoint_url = require_env("S3_ENDPOINT_URL")?;
        let s3_bucket =
            std::env::var("S3_BUCKET").unwrap_or_else(|_| "pumpkin-hub-binaries".to_string());
        let s3_access_key_id = require_env("S3_ACCESS_KEY_ID")?;
        let s3_secret_access_key = require_env("S3_SECRET_ACCESS_KEY")?;
        let s3_region = std::env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string());
        let s3_force_path_style = std::env::var("S3_FORCE_PATH_STYLE")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);
        let s3_public_url = std::env::var("S3_PUBLIC_URL").ok();
        let s3_use_direct_public_urls = std::env::var("S3_USE_DIRECT_URLS")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);
        let binary_max_size_bytes = parse_env_var::<u64>("BINARY_MAX_SIZE_BYTES", 104_857_600)?;

        let rate_limit = RateLimitConfig {
            general_per_second: parse_env_var::<u64>("RATE_LIMIT_GENERAL_PER_SECOND", 1)?,
            general_burst_size: parse_env_var::<u32>("RATE_LIMIT_GENERAL_BURST_SIZE", 30)?,
            auth_per_second: parse_env_var::<u64>("RATE_LIMIT_AUTH_PER_SECOND", 4)?,
            auth_burst_size: parse_env_var::<u32>("RATE_LIMIT_AUTH_BURST_SIZE", 5)?,
        };

        let smtp = load_smtp_config()?;
        let github_app = load_github_app_config()?;

        Ok(Config {
            server: ServerConfig {
                address: SocketAddr::new(ip, port),
                allowed_origins,
                api_public_url,
                secure_cookies,
                cookie_domain,
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
            s3: S3Config {
                endpoint_url: s3_endpoint_url,
                bucket: s3_bucket,
                access_key_id: s3_access_key_id,
                secret_access_key: s3_secret_access_key,
                region: s3_region,
                force_path_style: s3_force_path_style,
                public_url: s3_public_url,
                use_direct_public_urls: s3_use_direct_public_urls,
            },
            binary_max_size_bytes,
            rate_limit,
            smtp,
            github_app,
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
                secure_cookies: false,
                cookie_domain: None,
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
            s3: S3Config {
                endpoint_url: "http://localhost:9000".to_string(),
                bucket: "pumpkin-hub-binaries".to_string(),
                access_key_id: String::new(),
                secret_access_key: String::new(),
                region: "us-east-1".to_string(),
                force_path_style: true,
                public_url: None,
                use_direct_public_urls: false,
            },
            binary_max_size_bytes: 104_857_600,
            rate_limit: RateLimitConfig {
                general_per_second: 1,
                general_burst_size: 30,
                auth_per_second: 4,
                auth_burst_size: 5,
            },
            smtp: None,
            github_app: None,
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

/// Loads optional GitHub App config. Returns `None` if `GITHUB_APP_ID` is not set.
fn load_github_app_config() -> Result<Option<GitHubAppConfig>, ConfigError> {
    let app_id = match std::env::var("GITHUB_APP_ID") {
        Ok(val) if !val.is_empty() => val,
        _ => return Ok(None),
    };

    let private_key = require_env("GITHUB_APP_PRIVATE_KEY")?;
    let webhook_secret = require_env("GITHUB_APP_WEBHOOK_SECRET")?;

    Ok(Some(GitHubAppConfig {
        app_id,
        private_key,
        webhook_secret,
    }))
}

/// Loads optional SMTP config. Returns `None` if `SMTP_HOST` is not set.
fn load_smtp_config() -> Result<Option<SmtpConfig>, ConfigError> {
    let host = match std::env::var("SMTP_HOST") {
        Ok(val) if !val.is_empty() => val,
        _ => return Ok(None),
    };

    let port = parse_env_var::<u16>("SMTP_PORT", 587)?;
    let username = require_env("SMTP_USERNAME")?;
    let password = require_env("SMTP_PASSWORD")?;
    let from_address = require_env("SMTP_FROM_ADDRESS")?;

    Ok(Some(SmtpConfig {
        host,
        port,
        username,
        password,
        from_address,
    }))
}
