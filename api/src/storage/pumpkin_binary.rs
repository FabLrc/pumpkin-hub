use std::collections::HashMap;
use std::sync::Arc;

use serde::Deserialize;
use tokio::sync::Mutex;

use crate::error::AppError;

use super::ObjectStorage;

const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/Pumpkin-MC/Pumpkin/releases/latest";

/// S3 user-metadata key used to track which GitHub asset version is cached.
/// The SDK prefixes it with `x-amz-meta-` automatically.
const S3_META_UPDATED_AT: &str = "pumpkin-asset-updated-at";

// ── GitHub API types ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    updated_at: String,
    browser_download_url: String,
}

// ── Cache entry ───────────────────────────────────────────────────────────────

struct CachedBinary {
    /// ISO-8601 timestamp from the GitHub asset — used as version fingerprint.
    asset_updated_at: String,
    bytes: Vec<u8>,
}

// ── Public struct ─────────────────────────────────────────────────────────────

/// Cache for the Pumpkin server binary, one entry per platform.
///
/// Invalidation strategy: on every request we call the GitHub Releases API
/// (lightweight JSON, ~2 KB) to read the asset's `updated_at` timestamp.
/// We only re-download the binary (~50 MB) when that timestamp changes.
/// The timestamp is persisted as S3 object metadata so the cache survives
/// server restarts without hitting GitHub again.
///
/// A per-platform `Mutex` serialises concurrent fetch operations so that
/// only one task downloads the binary while others wait for the result.
#[derive(Clone)]
pub struct PumpkinBinaryCache {
    inner: Arc<Mutex<HashMap<String, CachedBinary>>>,
}

impl PumpkinBinaryCache {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Returns the Pumpkin server binary bytes for the requested platform.
    ///
    /// The `github_token` is optional; providing one raises the GitHub API
    /// rate limit from 60 to 5 000 requests per hour.
    pub async fn get_or_fetch(
        &self,
        platform: &str,
        storage: &ObjectStorage,
        github_token: Option<&str>,
    ) -> Result<Vec<u8>, AppError> {
        // Serialize per-platform to avoid concurrent GitHub downloads.
        let mut cache = self.inner.lock().await;

        // ── Step 1: fetch asset metadata from GitHub (lightweight) ────────────
        let github_result = Self::fetch_asset_info(platform, github_token).await;

        let (asset_updated_at, download_url) = match github_result {
            Ok(info) => info,
            Err(err) => {
                tracing::warn!(
                    %err, %platform,
                    "GitHub API unavailable for Pumpkin binary — using fallback cache"
                );
                // Fallback: try in-memory first, then S3.
                if let Some(entry) = cache.get(platform) {
                    return Ok(entry.bytes.clone());
                }
                return storage
                    .get_object_bytes(&Self::s3_key(platform))
                    .await
                    .map_err(|_| {
                        AppError::ServiceUnavailable(format!(
                            "Pumpkin binary unavailable for platform '{platform}': \
                             GitHub unreachable and no cached version found"
                        ))
                    });
            }
        };

        // ── Step 2: in-memory cache hit ───────────────────────────────────────
        if let Some(entry) = cache.get(platform) {
            if entry.asset_updated_at == asset_updated_at {
                tracing::debug!(%platform, %asset_updated_at, "Pumpkin binary: memory cache hit");
                return Ok(entry.bytes.clone());
            }
        }

        // ── Step 3: S3 cache hit (survives restarts) ──────────────────────────
        let s3_key = Self::s3_key(platform);
        let s3_meta = storage
            .head_object_metadata(&s3_key)
            .await
            .unwrap_or(None);

        if let Some(metadata) = s3_meta {
            if metadata
                .get(S3_META_UPDATED_AT)
                .map(|v| v.as_str())
                .unwrap_or("")
                == asset_updated_at
            {
                tracing::info!(%platform, %asset_updated_at, "Pumpkin binary: S3 cache hit");
                let bytes = storage.get_object_bytes(&s3_key).await?;
                cache.insert(
                    platform.to_string(),
                    CachedBinary {
                        asset_updated_at,
                        bytes: bytes.clone(),
                    },
                );
                return Ok(bytes);
            }
        }

        // ── Step 4: download from GitHub and refresh caches ───────────────────
        tracing::info!(
            %platform, %asset_updated_at,
            "Pumpkin binary: downloading new version from GitHub"
        );
        let bytes = Self::download_asset(&download_url, github_token).await?;

        let mut meta = HashMap::new();
        meta.insert(S3_META_UPDATED_AT.to_string(), asset_updated_at.clone());
        storage
            .put_object_with_metadata(&s3_key, bytes.clone(), "application/octet-stream", meta)
            .await?;

        cache.insert(
            platform.to_string(),
            CachedBinary {
                asset_updated_at,
                bytes: bytes.clone(),
            },
        );

        Ok(bytes)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// S3 key for the cached Pumpkin binary.
    /// Windows gets a `.exe` suffix; Linux and macOS do not.
    fn s3_key(platform: &str) -> String {
        let filename = if platform == "windows" {
            "pumpkin-server.exe"
        } else {
            "pumpkin-server"
        };
        format!("pumpkin-cache/{platform}/{filename}")
    }

    /// Calls the GitHub Releases API to get the `updated_at` timestamp and
    /// download URL of the asset matching the requested platform.
    async fn fetch_asset_info(
        platform: &str,
        github_token: Option<&str>,
    ) -> Result<(String, String), String> {
        let client = reqwest::Client::builder()
            .user_agent("pumpkin-hub-api/0.1")
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

        let mut req = client.get(GITHUB_RELEASES_URL);
        if let Some(token) = github_token {
            req = req.header("Authorization", format!("Bearer {token}"));
        }

        let response = req
            .send()
            .await
            .map_err(|e| format!("GitHub API request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!(
                "GitHub API returned HTTP {}",
                response.status().as_u16()
            ));
        }

        let release: GitHubRelease = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse GitHub release JSON: {e}"))?;

        let asset = release
            .assets
            .iter()
            .find(|a| a.name.contains(platform))
            .ok_or_else(|| {
                format!("No Pumpkin binary asset found for platform '{platform}'")
            })?;

        Ok((asset.updated_at.clone(), asset.browser_download_url.clone()))
    }

    /// Downloads binary bytes from the given URL.
    /// Uses a generous 120-second timeout for large files (~50 MB).
    async fn download_asset(url: &str, github_token: Option<&str>) -> Result<Vec<u8>, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("pumpkin-hub-api/0.1")
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(AppError::internal)?;

        let mut req = client.get(url);
        if let Some(token) = github_token {
            req = req.header("Authorization", format!("Bearer {token}"));
        }

        let response = req.send().await.map_err(AppError::internal)?;

        if !response.status().is_success() {
            return Err(AppError::ServiceUnavailable(format!(
                "Failed to download Pumpkin binary: HTTP {}",
                response.status().as_u16()
            )));
        }

        response
            .bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(AppError::internal)
    }
}

impl Default for PumpkinBinaryCache {
    fn default() -> Self {
        Self::new()
    }
}
