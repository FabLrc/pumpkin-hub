use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sha2::Digest;

use crate::error::AppError;
use crate::routes::studio::dto::NodeDefinition;

/// Base URL for Pumpkin MC WIT files on GitHub.
const PUMPKIN_WIT_BASE_URL: &str =
    "https://raw.githubusercontent.com/Pumpkin-MC/Pumpkin/master/pumpkin-plugin-wit/v0.1";

/// Files to fetch from the WIT repository.
const WIT_FILES: &[&str] = &[
    "plugin.wit",
    "event.wit",
    "server.wit",
    "world.wit",
    "command.wit",
    "player.wit",
    "common.wit",
    "text.wit",
    "entity.wit",
    "particles.wit",
    "sounds.wit",
    "scoreboard.wit",
    "scheduler.wit",
    "context.wit",
    "gui.wit",
];

/// A snapshot of WIT definitions with its hash.
pub struct WitSnapshot {
    pub hash: String,
    pub files: HashMap<String, String>,
    pub fetched_at: DateTime<Utc>,
}

/// Fetches all WIT files from the Pumpkin MC GitHub repository, computes
/// a combined SHA-256 hash, and returns the snapshot.
///
/// TODO Phase 5: Use `wit-parser` to parse WIT files into structured
/// node definitions and upsert into `node_registry` + `node_registry_snapshots`.
pub async fn fetch_wit_snapshot() -> Result<WitSnapshot, AppError> {
    let mut files = HashMap::new();
    let mut hasher = sha2::Sha256::new();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| {
            AppError::internal(std::io::Error::other(format!(
                "failed to build HTTP client: {e}"
            )))
        })?;

    for filename in WIT_FILES {
        let url = format!("{PUMPKIN_WIT_BASE_URL}/{filename}");
        let response = client.get(&url).send().await.map_err(|e| {
            AppError::internal(std::io::Error::other(format!("failed to fetch {url}: {e}")))
        })?;

        let text = response.text().await.map_err(|e| {
            AppError::internal(std::io::Error::other(format!(
                "failed to read response body: {e}"
            )))
        })?;

        hasher.update(filename.as_bytes());
        hasher.update(text.as_bytes());

        files.insert(filename.to_string(), text);
    }

    let hash = format!("{:x}", hasher.finalize());

    Ok(WitSnapshot {
        hash,
        files,
        fetched_at: chrono::Utc::now(),
    })
}

/// Parses the WIT files to extract node definitions.
/// Uses `wit-parser` crate to parse WIT AST and map to node definitions.
///
/// TODO Phase 5: implement full WIT → NodeDefinition mapping.
#[allow(dead_code)]
pub fn parse_wit_to_nodes(snapshot: &WitSnapshot) -> Result<Vec<NodeDefinition>, AppError> {
    // Placeholder: returns an empty list
    // Phase 5 will use wit-parser to:
    // 1. Parse plugin.wit to discover all interface imports
    // 2. Parse each interface's .wit file
    // 3. Map records to Event nodes, functions to Action nodes
    // 4. Upsert into node_registry
    tracing::info!(
        "WIT snapshot parsed: hash={}, files={}, fetched_at={}",
        snapshot.hash,
        snapshot.files.len(),
        snapshot.fetched_at
    );
    Ok(Vec::new())
}
