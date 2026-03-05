use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use thiserror::Error;

#[derive(Debug, Clone)]
pub struct Config {
    pub server: ServerConfig,
    pub database_url: String,
    pub meilisearch: MeilisearchConfig,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub address: SocketAddr,
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct MeilisearchConfig {
    pub url: String,
    pub master_key: String,
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
        let host = std::env::var("SERVER_HOST")
            .unwrap_or_else(|_| "0.0.0.0".to_string());
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

        let database_url = require_env("DATABASE_URL")?;
        let meilisearch_url = require_env("MEILISEARCH_URL")?;
        let meilisearch_key = require_env("MEILISEARCH_KEY")?;

        Ok(Config {
            server: ServerConfig {
                address: SocketAddr::new(ip, port),
                allowed_origins,
            },
            database_url,
            meilisearch: MeilisearchConfig {
                url: meilisearch_url,
                master_key: meilisearch_key,
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
            },
            database_url: String::new(),
            meilisearch: MeilisearchConfig {
                url: String::new(),
                master_key: String::new(),
            },
        }
    }
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
