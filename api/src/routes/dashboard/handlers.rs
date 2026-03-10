use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    AuthorDashboardStats, DownloadDataPoint, DownloadStatsParams, PluginDownloadStats, TopPlugin,
    VersionDownloadSummary,
};

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct TopPluginRow {
    name: String,
    slug: String,
    downloads_total: i64,
}

#[derive(Debug, FromRow)]
struct DownloadTimeRow {
    period: String,
    downloads: i64,
}

#[derive(Debug, FromRow)]
struct VersionSummaryRow {
    version: String,
    downloads: i64,
    published_at: DateTime<Utc>,
}

// ── Author Dashboard Stats ──────────────────────────────────────────────────

/// GET /api/v1/dashboard/stats — advanced KPIs for the authenticated author.
pub async fn get_author_stats(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<DownloadStatsParams>,
) -> Result<Json<AuthorDashboardStats>, AppError> {
    auth.require_permission("read")?;
    let pool = &state.db;
    let author_id = auth.user_id;

    // Total plugins & downloads
    let (total_plugins, total_downloads): (i64, i64) = sqlx::query_as(
        "SELECT COUNT(*)::BIGINT, COALESCE(SUM(downloads_total), 0)::BIGINT
         FROM plugins
         WHERE author_id = $1 AND is_active = true",
    )
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    // Downloads last 30 days
    let downloads_last_30_days = count_author_downloads_since(pool, author_id, 30).await?;

    // Downloads last 7 days
    let downloads_last_7_days = count_author_downloads_since(pool, author_id, 7).await?;

    // Trend: compare last 30d vs previous 30d
    let downloads_prev_30_days = count_author_downloads_range(pool, author_id, 60, 30).await?;
    let downloads_trend_percent = calculate_trend(downloads_last_30_days, downloads_prev_30_days);

    // Most downloaded plugin
    let most_downloaded_plugin: Option<TopPluginRow> = sqlx::query_as(
        "SELECT name, slug, downloads_total
         FROM plugins
         WHERE author_id = $1 AND is_active = true
         ORDER BY downloads_total DESC
         LIMIT 1",
    )
    .bind(author_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    // Recent download chart
    let recent_downloads =
        aggregate_author_downloads(pool, author_id, params.granularity(), params.periods()).await?;

    Ok(Json(AuthorDashboardStats {
        total_plugins,
        total_downloads,
        downloads_last_30_days,
        downloads_last_7_days,
        downloads_trend_percent,
        most_downloaded_plugin: most_downloaded_plugin.map(|r| TopPlugin {
            name: r.name,
            slug: r.slug,
            downloads_total: r.downloads_total,
        }),
        recent_downloads,
    }))
}

/// GET /api/v1/dashboard/downloads — aggregated download chart for the author.
pub async fn get_author_downloads(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<DownloadStatsParams>,
) -> Result<Json<Vec<DownloadDataPoint>>, AppError> {
    auth.require_permission("read")?;
    let pool = &state.db;
    let data =
        aggregate_author_downloads(pool, auth.user_id, params.granularity(), params.periods())
            .await?;
    Ok(Json(data))
}

/// GET /api/v1/plugins/:slug/download-stats — download analytics for a specific plugin.
pub async fn get_plugin_download_stats(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(params): Query<DownloadStatsParams>,
) -> Result<Json<PluginDownloadStats>, AppError> {
    let pool = &state.db;

    let plugin_id: Uuid =
        sqlx::query_scalar("SELECT id FROM plugins WHERE slug = $1 AND is_active = true")
            .bind(&slug)
            .fetch_optional(pool)
            .await
            .map_err(AppError::internal)?
            .ok_or(AppError::NotFound)?;

    let total_downloads: i64 =
        sqlx::query_scalar("SELECT downloads_total FROM plugins WHERE id = $1")
            .bind(plugin_id)
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?;

    let downloads_last_30_days = count_plugin_downloads_since(pool, plugin_id, 30).await?;
    let downloads_last_7_days = count_plugin_downloads_since(pool, plugin_id, 7).await?;

    let downloads_prev_30_days = count_plugin_downloads_range(pool, plugin_id, 60, 30).await?;
    let downloads_trend_percent = calculate_trend(downloads_last_30_days, downloads_prev_30_days);

    let chart =
        aggregate_plugin_downloads(pool, plugin_id, params.granularity(), params.periods()).await?;

    let version_rows: Vec<VersionSummaryRow> = sqlx::query_as(
        "SELECT version, downloads, published_at
         FROM versions
         WHERE plugin_id = $1
         ORDER BY published_at DESC",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(PluginDownloadStats {
        plugin_slug: slug,
        total_downloads,
        downloads_last_30_days,
        downloads_last_7_days,
        downloads_trend_percent,
        chart,
        by_version: version_rows
            .into_iter()
            .map(|r| VersionDownloadSummary {
                version: r.version,
                downloads: r.downloads,
                published_at: r.published_at,
            })
            .collect(),
    }))
}

// ── Query Helpers ───────────────────────────────────────────────────────────

async fn count_author_downloads_since(
    pool: &PgPool,
    author_id: Uuid,
    days: i32,
) -> Result<i64, AppError> {
    sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM download_events de
         JOIN plugins p ON de.plugin_id = p.id
         WHERE p.author_id = $1 AND de.downloaded_at >= NOW() - make_interval(days => $2)",
    )
    .bind(author_id)
    .bind(days)
    .fetch_one(pool)
    .await
    .map(|v| v.unwrap_or(0))
    .map_err(AppError::internal)
}

async fn count_author_downloads_range(
    pool: &PgPool,
    author_id: Uuid,
    days_ago_start: i32,
    days_ago_end: i32,
) -> Result<i64, AppError> {
    sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM download_events de
         JOIN plugins p ON de.plugin_id = p.id
         WHERE p.author_id = $1
           AND de.downloaded_at >= NOW() - make_interval(days => $2)
           AND de.downloaded_at < NOW() - make_interval(days => $3)",
    )
    .bind(author_id)
    .bind(days_ago_start)
    .bind(days_ago_end)
    .fetch_one(pool)
    .await
    .map(|v| v.unwrap_or(0))
    .map_err(AppError::internal)
}

async fn count_plugin_downloads_since(
    pool: &PgPool,
    plugin_id: Uuid,
    days: i32,
) -> Result<i64, AppError> {
    sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM download_events
         WHERE plugin_id = $1 AND downloaded_at >= NOW() - make_interval(days => $2)",
    )
    .bind(plugin_id)
    .bind(days)
    .fetch_one(pool)
    .await
    .map(|v| v.unwrap_or(0))
    .map_err(AppError::internal)
}

async fn count_plugin_downloads_range(
    pool: &PgPool,
    plugin_id: Uuid,
    days_ago_start: i32,
    days_ago_end: i32,
) -> Result<i64, AppError> {
    sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*)
         FROM download_events
         WHERE plugin_id = $1
           AND downloaded_at >= NOW() - make_interval(days => $2)
           AND downloaded_at < NOW() - make_interval(days => $3)",
    )
    .bind(plugin_id)
    .bind(days_ago_start)
    .bind(days_ago_end)
    .fetch_one(pool)
    .await
    .map(|v| v.unwrap_or(0))
    .map_err(AppError::internal)
}

fn build_time_series_query(scope: &str, granularity: &str) -> String {
    let interval = match granularity {
        "daily" => "1 day",
        "monthly" => "1 month",
        _ => "1 week",
    };

    let format = match granularity {
        "daily" => "YYYY-MM-DD",
        "monthly" => "YYYY-MM",
        _ => "IYYY-\"W\"IW",
    };

    let granularity_trunc = match granularity {
        "daily" => "day",
        "monthly" => "month",
        _ => "week",
    };

    let scope_filter = match scope {
        "author" => "AND de.plugin_id IN (SELECT id FROM plugins WHERE author_id = $1)",
        "plugin" => "AND de.plugin_id = $1",
        _ => unreachable!(),
    };

    format!(
        "WITH periods AS (
            SELECT generate_series(
                DATE_TRUNC('{granularity_trunc}', NOW() - ($2::INT * INTERVAL '{interval}')),
                DATE_TRUNC('{granularity_trunc}', NOW()),
                INTERVAL '{interval}'
            ) AS period
        )
        SELECT
            TO_CHAR(periods.period, '{format}') AS period,
            COUNT(de.id)::BIGINT AS downloads
        FROM periods
        LEFT JOIN download_events de
            ON de.downloaded_at >= periods.period
            AND de.downloaded_at < periods.period + INTERVAL '{interval}'
            {scope_filter}
        GROUP BY periods.period
        ORDER BY periods.period ASC",
    )
}

async fn aggregate_author_downloads(
    pool: &PgPool,
    author_id: Uuid,
    granularity: &str,
    periods: u32,
) -> Result<Vec<DownloadDataPoint>, AppError> {
    let query = build_time_series_query("author", granularity);
    let rows: Vec<DownloadTimeRow> = sqlx::query_as(&query)
        .bind(author_id)
        .bind(periods as i32)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

    Ok(rows
        .into_iter()
        .map(|r| DownloadDataPoint {
            period: r.period,
            downloads: r.downloads,
        })
        .collect())
}

async fn aggregate_plugin_downloads(
    pool: &PgPool,
    plugin_id: Uuid,
    granularity: &str,
    periods: u32,
) -> Result<Vec<DownloadDataPoint>, AppError> {
    let query = build_time_series_query("plugin", granularity);
    let rows: Vec<DownloadTimeRow> = sqlx::query_as(&query)
        .bind(plugin_id)
        .bind(periods as i32)
        .fetch_all(pool)
        .await
        .map_err(AppError::internal)?;

    Ok(rows
        .into_iter()
        .map(|r| DownloadDataPoint {
            period: r.period,
            downloads: r.downloads,
        })
        .collect())
}

fn calculate_trend(current: i64, previous: i64) -> f64 {
    if previous == 0 {
        if current > 0 {
            100.0
        } else {
            0.0
        }
    } else {
        ((current as f64 - previous as f64) / previous as f64) * 100.0
    }
}
