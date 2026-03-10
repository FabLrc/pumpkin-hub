use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct DownloadStatsParams {
    /// Grouping granularity: "daily", "weekly", or "monthly".
    pub granularity: Option<String>,
    /// Number of periods to return (default 12).
    pub periods: Option<u32>,
}

const DEFAULT_PERIODS: u32 = 12;
const MAX_PERIODS: u32 = 52;

impl DownloadStatsParams {
    pub fn granularity(&self) -> &str {
        match self.granularity.as_deref() {
            Some("daily") => "daily",
            Some("monthly") => "monthly",
            _ => "weekly",
        }
    }

    pub fn periods(&self) -> u32 {
        self.periods
            .unwrap_or(DEFAULT_PERIODS)
            .clamp(1, MAX_PERIODS)
    }
}

// ── Response DTOs ───────────────────────────────────────────────────────────

/// Advanced KPIs for the author's dashboard.
#[derive(Debug, Serialize)]
pub struct AuthorDashboardStats {
    pub total_plugins: i64,
    pub total_downloads: i64,
    pub downloads_last_30_days: i64,
    pub downloads_last_7_days: i64,
    pub downloads_trend_percent: f64,
    pub most_downloaded_plugin: Option<TopPlugin>,
    pub recent_downloads: Vec<DownloadDataPoint>,
}

#[derive(Debug, Serialize)]
pub struct TopPlugin {
    pub name: String,
    pub slug: String,
    pub downloads_total: i64,
}

/// A single data point in a download time series chart.
#[derive(Debug, Serialize)]
pub struct DownloadDataPoint {
    pub period: String,
    pub downloads: i64,
}

/// Per-plugin download stats for the plugin detail page.
#[derive(Debug, Serialize)]
pub struct PluginDownloadStats {
    pub plugin_slug: String,
    pub total_downloads: i64,
    pub downloads_last_30_days: i64,
    pub downloads_last_7_days: i64,
    pub downloads_trend_percent: f64,
    pub chart: Vec<DownloadDataPoint>,
    pub by_version: Vec<VersionDownloadSummary>,
}

#[derive(Debug, Serialize)]
pub struct VersionDownloadSummary {
    pub version: String,
    pub downloads: i64,
    pub published_at: DateTime<Utc>,
}
