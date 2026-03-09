use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/// A Pumpkin MC release tag fetched from GitHub.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PumpkinVersion {
    pub version: String,
    pub tag_name: String,
    pub published_at: Option<String>,
}

/// Fetches and caches Pumpkin MC versions from the official GitHub repository.
#[derive(Clone)]
pub struct PumpkinVersionFetcher {
    cache: Arc<RwLock<CachedVersions>>,
}

struct CachedVersions {
    versions: Vec<PumpkinVersion>,
    last_fetched: Option<std::time::Instant>,
}

/// GitHub release API response (subset of fields).
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    published_at: Option<String>,
    draft: bool,
    #[allow(dead_code)]
    prerelease: bool,
}

const GITHUB_API_URL: &str = "https://api.github.com/repos/Snowiiii/Pumpkin/releases";
const CACHE_TTL_SECONDS: u64 = 3600; // 1 hour
const MAX_RELEASES: usize = 100;

impl PumpkinVersionFetcher {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(CachedVersions {
                versions: Vec::new(),
                last_fetched: None,
            })),
        }
    }

    /// Returns cached versions, fetching from GitHub if the cache is stale or empty.
    pub async fn get_versions(&self) -> Result<Vec<PumpkinVersion>, String> {
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(last_fetched) = cache.last_fetched {
                if last_fetched.elapsed().as_secs() < CACHE_TTL_SECONDS
                    && !cache.versions.is_empty()
                {
                    return Ok(cache.versions.clone());
                }
            }
        }

        // Cache miss or stale — fetch from GitHub
        match self.fetch_from_github().await {
            Ok(versions) => {
                let mut cache = self.cache.write().await;
                cache.versions = versions.clone();
                cache.last_fetched = Some(std::time::Instant::now());
                Ok(versions)
            }
            Err(err) => {
                // If fetch fails but we have stale data, return it
                let cache = self.cache.read().await;
                if !cache.versions.is_empty() {
                    tracing::warn!("GitHub fetch failed, returning stale cache: {err}");
                    return Ok(cache.versions.clone());
                }
                Err(err)
            }
        }
    }

    /// Fetches releases from the official Pumpkin GitHub repository.
    async fn fetch_from_github(&self) -> Result<Vec<PumpkinVersion>, String> {
        let client = reqwest::Client::builder()
            .user_agent("pumpkin-hub-api/0.1")
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

        let response = client
            .get(GITHUB_API_URL)
            .query(&[("per_page", MAX_RELEASES.to_string())])
            .send()
            .await
            .map_err(|e| format!("GitHub API request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!("GitHub API returned status {}", response.status()));
        }

        let releases: Vec<GitHubRelease> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse GitHub releases: {e}"))?;

        let versions: Vec<PumpkinVersion> = releases
            .into_iter()
            .filter(|r| !r.draft)
            .map(|r| {
                let version = r
                    .tag_name
                    .strip_prefix('v')
                    .unwrap_or(&r.tag_name)
                    .to_string();
                PumpkinVersion {
                    version,
                    tag_name: r.tag_name,
                    published_at: r.published_at,
                }
            })
            .collect();

        tracing::info!("Fetched {} Pumpkin versions from GitHub", versions.len());
        Ok(versions)
    }

    /// Forces a cache refresh, useful after startup.
    pub async fn refresh(&self) -> Result<(), String> {
        self.get_versions().await.map(|_| ())
    }
}

impl Default for PumpkinVersionFetcher {
    fn default() -> Self {
        Self::new()
    }
}
