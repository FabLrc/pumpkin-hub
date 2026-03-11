use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::config::GitHubAppConfig;

const GITHUB_API_BASE: &str = "https://api.github.com";

/// JWT claims for GitHub App authentication.
#[derive(Serialize)]
struct GitHubAppClaims {
    iat: i64,
    exp: i64,
    iss: String,
}

/// Response from GitHub when creating an installation access token.
#[derive(Deserialize)]
struct InstallationTokenResponse {
    token: String,
}

/// A repository returned by the GitHub API.
#[derive(Debug, Deserialize, Serialize)]
pub struct GitHubRepository {
    pub name: String,
    pub full_name: String,
    pub default_branch: String,
    pub description: Option<String>,
}

/// An installation of the GitHub App, returned by `GET /app/installations`.
#[derive(Debug, Deserialize)]
pub struct AppInstallation {
    pub id: i64,
    pub account: AppInstallationAccount,
}

/// The GitHub account (user or organization) that owns an installation.
#[derive(Debug, Deserialize)]
pub struct AppInstallationAccount {
    pub id: i64,
    pub login: String,
    /// "User" or "Organization".
    #[serde(rename = "type")]
    pub account_type: String,
}

/// A release returned by the GitHub API.
#[derive(Debug, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub name: Option<String>,
    pub body: Option<String>,
    pub assets: Vec<GitHubReleaseAsset>,
}

/// A file asset attached to a GitHub release.
#[derive(Debug, Deserialize)]
pub struct GitHubReleaseAsset {
    pub name: String,
    pub size: i64,
    pub content_type: String,
    pub browser_download_url: String,
}

/// Decoded content from the GitHub Contents API.
#[derive(Debug, Deserialize)]
struct GitHubContentResponse {
    content: Option<String>,
    encoding: Option<String>,
}

/// Client for the GitHub App API.
/// Handles JWT generation, installation tokens, and API calls.
pub struct GitHubAppClient {
    http: Client,
    config: GitHubAppConfig,
}

impl GitHubAppClient {
    pub fn new(config: &GitHubAppConfig) -> Self {
        let http = Client::builder()
            .user_agent("PumpkinHub-GitHubApp")
            .build()
            .expect("Failed to build GitHub HTTP client");

        Self {
            http,
            config: config.clone(),
        }
    }

    /// Generates a short-lived JWT (10 min) to authenticate as the GitHub App itself.
    fn generate_app_jwt(&self) -> Result<String, GitHubClientError> {
        let now = Utc::now().timestamp();
        let claims = GitHubAppClaims {
            iat: now - 60, // Allow 60s clock drift
            exp: now + 600,
            iss: self.config.app_id.clone(),
        };

        let key = EncodingKey::from_rsa_pem(self.config.private_key.as_bytes()).map_err(|err| {
            GitHubClientError::Configuration(format!("Invalid RSA private key: {err}"))
        })?;

        encode(&Header::new(Algorithm::RS256), &claims, &key)
            .map_err(|err| GitHubClientError::Configuration(format!("JWT encoding failed: {err}")))
    }

    /// Obtains an installation access token scoped to a specific installation.
    async fn get_installation_token(
        &self,
        installation_id: i64,
    ) -> Result<String, GitHubClientError> {
        let jwt = self.generate_app_jwt()?;

        let response = self
            .http
            .post(format!(
                "{GITHUB_API_BASE}/app/installations/{installation_id}/access_tokens"
            ))
            .header("Authorization", format!("Bearer {jwt}"))
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(GitHubClientError::Api(format!(
                "Failed to get installation token: {status} — {body}"
            )));
        }

        let token_response: InstallationTokenResponse =
            response.json().await.map_err(GitHubClientError::Http)?;

        Ok(token_response.token)
    }

    /// Lists all installations of this GitHub App (authenticated as the App itself).
    pub async fn list_app_installations(&self) -> Result<Vec<AppInstallation>, GitHubClientError> {
        let jwt = self.generate_app_jwt()?;

        let mut all_installations = Vec::new();
        let mut page = 1u32;

        loop {
            let response = self
                .http
                .get(format!("{GITHUB_API_BASE}/app/installations"))
                .header("Authorization", format!("Bearer {jwt}"))
                .header("Accept", "application/vnd.github+json")
                .query(&[("per_page", "100"), ("page", &page.to_string())])
                .send()
                .await
                .map_err(GitHubClientError::Http)?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(GitHubClientError::Api(format!(
                    "Failed to list app installations: {status} — {body}"
                )));
            }

            let batch: Vec<AppInstallation> =
                response.json().await.map_err(GitHubClientError::Http)?;

            let is_last_page = batch.len() < 100;
            all_installations.extend(batch);

            if is_last_page {
                break;
            }
            page += 1;
        }

        Ok(all_installations)
    }

    /// Lists repositories accessible to a given installation.
    pub async fn list_installation_repositories(
        &self,
        installation_id: i64,
    ) -> Result<Vec<GitHubRepository>, GitHubClientError> {
        let token = self.get_installation_token(installation_id).await?;

        let response = self
            .http
            .get(format!("{GITHUB_API_BASE}/installation/repositories"))
            .header("Authorization", format!("Bearer {token}"))
            .header("Accept", "application/vnd.github+json")
            .query(&[("per_page", "100")])
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(GitHubClientError::Api(format!(
                "Failed to list repos: {status} — {body}"
            )));
        }

        #[derive(Deserialize)]
        struct ListReposResponse {
            repositories: Vec<GitHubRepository>,
        }

        let data: ListReposResponse = response.json().await.map_err(GitHubClientError::Http)?;
        Ok(data.repositories)
    }

    /// Fetches a specific repository's info to validate access.
    pub async fn get_repository(
        &self,
        installation_id: i64,
        owner: &str,
        repo: &str,
    ) -> Result<GitHubRepository, GitHubClientError> {
        let token = self.get_installation_token(installation_id).await?;

        let response = self
            .http
            .get(format!("{GITHUB_API_BASE}/repos/{owner}/{repo}"))
            .header("Authorization", format!("Bearer {token}"))
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(GitHubClientError::Api(format!(
                "Failed to get repo {owner}/{repo}: {status} — {body}"
            )));
        }

        response.json().await.map_err(GitHubClientError::Http)
    }

    /// Fetches the text content of a file from a repository.
    pub async fn get_file_content(
        &self,
        installation_id: i64,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> Result<Option<String>, GitHubClientError> {
        let token = self.get_installation_token(installation_id).await?;

        let response = self
            .http
            .get(format!(
                "{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
            ))
            .header("Authorization", format!("Bearer {token}"))
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(GitHubClientError::Api(format!(
                "Failed to fetch {path}: {status} — {body}"
            )));
        }

        let content_response: GitHubContentResponse =
            response.json().await.map_err(GitHubClientError::Http)?;

        match (content_response.content, content_response.encoding) {
            (Some(encoded), Some(encoding)) if encoding == "base64" => {
                let cleaned = encoded.replace('\n', "");
                let decoded = base64_decode(&cleaned)?;
                Ok(Some(decoded))
            }
            _ => Ok(None),
        }
    }

    /// Fetches a release by tag from a repository.
    pub async fn get_release_by_tag(
        &self,
        installation_id: i64,
        owner: &str,
        repo: &str,
        tag: &str,
    ) -> Result<GitHubRelease, GitHubClientError> {
        let token = self.get_installation_token(installation_id).await?;

        let response = self
            .http
            .get(format!(
                "{GITHUB_API_BASE}/repos/{owner}/{repo}/releases/tags/{tag}"
            ))
            .header("Authorization", format!("Bearer {token}"))
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(GitHubClientError::Api(format!(
                "Failed to get release {tag}: {status} — {body}"
            )));
        }

        response.json().await.map_err(GitHubClientError::Http)
    }

    /// Downloads a release asset's binary content.
    pub async fn download_asset(&self, url: &str) -> Result<Vec<u8>, GitHubClientError> {
        let response = self
            .http
            .get(url)
            .header("Accept", "application/octet-stream")
            .send()
            .await
            .map_err(GitHubClientError::Http)?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(GitHubClientError::Api(format!(
                "Failed to download asset: {status}"
            )));
        }

        response
            .bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(GitHubClientError::Http)
    }
}

/// Verifies the HMAC-SHA256 signature of a GitHub webhook payload.
pub fn verify_webhook_signature(secret: &str, payload: &[u8], signature: &str) -> bool {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let sig_hex = match signature.strip_prefix("sha256=") {
        Some(hex) => hex,
        None => return false,
    };

    let expected_bytes = match hex::decode(sig_hex) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let mut mac = match Hmac::<Sha256>::new_from_slice(secret.as_bytes()) {
        Ok(mac) => mac,
        Err(_) => return false,
    };

    mac.update(payload);
    mac.verify_slice(&expected_bytes).is_ok()
}

/// Decodes a base64-encoded string into UTF-8 text.
fn base64_decode(input: &str) -> Result<String, GitHubClientError> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(input)
        .map_err(|e| GitHubClientError::Api(format!("Base64 decode error: {e}")))?;
    String::from_utf8(bytes).map_err(|e| GitHubClientError::Api(format!("UTF-8 decode error: {e}")))
}

/// Errors that can occur when interacting with the GitHub API.
#[derive(Debug, thiserror::Error)]
pub enum GitHubClientError {
    #[error("GitHub API configuration error: {0}")]
    Configuration(String),

    #[error("GitHub API HTTP error: {0}")]
    Http(#[source] reqwest::Error),

    #[error("GitHub API error: {0}")]
    Api(String),
}
