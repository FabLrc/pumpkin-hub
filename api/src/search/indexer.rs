use meilisearch_sdk::client::Client;
use meilisearch_sdk::search::{SearchResults, Selectors};
use meilisearch_sdk::settings::Settings;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::MeilisearchConfig;
use crate::error::AppError;

const INDEX_NAME: &str = "plugins";

/// A denormalized plugin document stored in the Meilisearch index.
/// Contains all fields needed for search, facets, and display.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDocument {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub author_username: String,
    pub author_id: String,
    pub license: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<String>,
    pub category_slugs: Vec<String>,
    pub platforms: Vec<String>,
    pub pumpkin_versions: Vec<String>,
    pub created_at_timestamp: i64,
    pub updated_at_timestamp: i64,
    pub average_rating: f64,
    pub review_count: i64,
}

/// Search query parameters received from the API.
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub category: Option<String>,
    pub platform: Option<String>,
    pub pumpkin_version: Option<String>,
    pub sort: Option<String>,
    pub page: Option<usize>,
    pub per_page: Option<usize>,
}

/// A single search hit returned to the client.
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub short_description: Option<String>,
    pub author_username: String,
    pub license: Option<String>,
    pub downloads_total: i64,
    pub categories: Vec<String>,
    pub category_slugs: Vec<String>,
    pub platforms: Vec<String>,
    pub pumpkin_versions: Vec<String>,
    pub created_at_timestamp: i64,
    pub updated_at_timestamp: i64,
    pub average_rating: f64,
    pub review_count: i64,
}

/// Facet distribution returned alongside search results.
#[derive(Debug, Serialize)]
pub struct FacetDistribution {
    pub categories: std::collections::HashMap<String, usize>,
    pub platforms: std::collections::HashMap<String, usize>,
    pub pumpkin_versions: std::collections::HashMap<String, usize>,
}

/// Full search response including hits, pagination, and facets.
#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub hits: Vec<SearchHit>,
    pub query: String,
    pub processing_time_ms: usize,
    pub estimated_total_hits: Option<usize>,
    pub facet_distribution: Option<FacetDistribution>,
    pub page: usize,
    pub per_page: usize,
}

/// Autocompletion suggestion.
#[derive(Debug, Serialize)]
pub struct Suggestion {
    pub name: String,
    pub slug: String,
}

/// Service encapsulating all Meilisearch operations.
#[derive(Clone)]
pub struct SearchService {
    client: Client,
}

impl SearchService {
    pub fn new(config: &MeilisearchConfig) -> Self {
        let client = Client::new(&config.url, Some(&config.master_key))
            .expect("Failed to create Meilisearch client");
        Self { client }
    }

    /// Configures the index settings: searchable, filterable, sortable attributes.
    /// Called once at application startup to ensure the index is properly configured.
    pub async fn configure_index(&self) -> Result<(), AppError> {
        let settings = Settings::new()
            .with_searchable_attributes([
                "name",
                "short_description",
                "description",
                "author_username",
                "categories",
            ])
            .with_filterable_attributes([
                "category_slugs",
                "platforms",
                "pumpkin_versions",
                "author_username",
            ])
            .with_sortable_attributes([
                "downloads_total",
                "created_at_timestamp",
                "updated_at_timestamp",
                "name",
                "average_rating",
            ])
            .with_displayed_attributes([
                "id",
                "name",
                "slug",
                "short_description",
                "author_username",
                "license",
                "downloads_total",
                "categories",
                "category_slugs",
                "platforms",
                "pumpkin_versions",
                "created_at_timestamp",
                "updated_at_timestamp",
                "average_rating",
                "review_count",
            ])
            .with_ranking_rules([
                "words",
                "typo",
                "proximity",
                "attribute",
                "sort",
                "exactness",
            ]);

        self.client
            .index(INDEX_NAME)
            .set_settings(&settings)
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Failed to configure Meilisearch index: {e}"
                )))
            })?;

        tracing::info!("Meilisearch index '{INDEX_NAME}' configured");
        Ok(())
    }

    /// Indexes a single plugin document (upsert).
    pub async fn index_plugin(&self, doc: &PluginDocument) -> Result<(), AppError> {
        self.client
            .index(INDEX_NAME)
            .add_documents(&[doc], Some("id"))
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Failed to index plugin: {e}"
                )))
            })?;
        Ok(())
    }

    /// Indexes multiple plugin documents at once (bulk upsert).
    pub async fn index_plugins(&self, docs: &[PluginDocument]) -> Result<(), AppError> {
        if docs.is_empty() {
            return Ok(());
        }
        self.client
            .index(INDEX_NAME)
            .add_documents(docs, Some("id"))
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Failed to bulk-index plugins: {e}"
                )))
            })?;
        Ok(())
    }

    /// Removes a plugin from the index by its ID.
    pub async fn delete_plugin(&self, plugin_id: &str) -> Result<(), AppError> {
        self.client
            .index(INDEX_NAME)
            .delete_document(plugin_id)
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Failed to delete plugin from index: {e}"
                )))
            })?;
        Ok(())
    }

    /// Performs a full-text search with optional faceted filters and sorting.
    pub async fn search(&self, query: &SearchQuery) -> Result<SearchResponse, AppError> {
        let q = query.q.as_deref().unwrap_or("");
        let page = query.page.unwrap_or(1).max(1);
        let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let mut filters: Vec<String> = Vec::new();
        if let Some(ref cat) = query.category {
            filters.push(format!(
                "category_slugs = \"{}\"",
                sanitize_filter_value(cat)
            ));
        }
        if let Some(ref platform) = query.platform {
            filters.push(format!(
                "platforms = \"{}\"",
                sanitize_filter_value(platform)
            ));
        }
        if let Some(ref pv) = query.pumpkin_version {
            filters.push(format!(
                "pumpkin_versions = \"{}\"",
                sanitize_filter_value(pv)
            ));
        }
        let filter_str = if filters.is_empty() {
            None
        } else {
            Some(filters.join(" AND "))
        };

        let sort_options: Option<Vec<&str>> = query.sort.as_deref().map(|s| match s {
            "downloads" | "downloads_desc" => vec!["downloads_total:desc"],
            "downloads_asc" => vec!["downloads_total:asc"],
            "newest" | "date_desc" => vec!["created_at_timestamp:desc"],
            "oldest" | "date_asc" => vec!["created_at_timestamp:asc"],
            "updated" => vec!["updated_at_timestamp:desc"],
            "name_asc" => vec!["name:asc"],
            "name_desc" => vec!["name:desc"],
            "rating" | "rating_desc" => vec!["average_rating:desc"],
            "rating_asc" => vec!["average_rating:asc"],
            _ => vec!["downloads_total:desc"],
        });

        let index = self.client.index(INDEX_NAME);
        let mut search_request = index.search();

        search_request.with_query(q);
        search_request.with_limit(per_page);
        search_request.with_offset(offset);
        search_request.with_show_matches_position(false);

        if let Some(ref filter) = filter_str {
            search_request.with_filter(filter);
        }
        if let Some(ref sort) = sort_options {
            search_request.with_sort(sort);
        }

        // Request facet distribution
        search_request.with_facets(Selectors::Some(&[
            "category_slugs",
            "platforms",
            "pumpkin_versions",
        ]));

        let results: SearchResults<SearchHit> = search_request.execute().await.map_err(|e| {
            AppError::internal(std::io::Error::other(format!(
                "Meilisearch search failed: {e}"
            )))
        })?;

        let hits: Vec<SearchHit> = results.hits.into_iter().map(|hit| hit.result).collect();

        let facet_distribution = results.facet_distribution.map(|fd| FacetDistribution {
            categories: fd.get("category_slugs").cloned().unwrap_or_default(),
            platforms: fd.get("platforms").cloned().unwrap_or_default(),
            pumpkin_versions: fd.get("pumpkin_versions").cloned().unwrap_or_default(),
        });

        Ok(SearchResponse {
            hits,
            query: q.to_string(),
            processing_time_ms: results.processing_time_ms,
            estimated_total_hits: results.estimated_total_hits,
            facet_distribution,
            page,
            per_page,
        })
    }

    /// Returns autocomplete suggestions for partial queries.
    pub async fn suggest(&self, query: &str, limit: usize) -> Result<Vec<Suggestion>, AppError> {
        let results: SearchResults<SearchHit> = self
            .client
            .index(INDEX_NAME)
            .search()
            .with_query(query)
            .with_limit(limit.min(10))
            .execute()
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Meilisearch suggest failed: {e}"
                )))
            })?;

        let suggestions = results
            .hits
            .into_iter()
            .map(|hit| Suggestion {
                name: hit.result.name,
                slug: hit.result.slug,
            })
            .collect();

        Ok(suggestions)
    }

    /// Re-indexes all active plugins from the database.
    /// Used on startup to ensure index is in sync.
    pub async fn reindex_all(&self, pool: &PgPool) -> Result<usize, AppError> {
        let docs = build_plugin_documents(pool).await?;
        let count = docs.len();

        if docs.is_empty() {
            tracing::info!("No plugins to index");
            return Ok(0);
        }

        // Delete all documents first to clean stale entries
        self.client
            .index(INDEX_NAME)
            .delete_all_documents()
            .await
            .map_err(|e| {
                AppError::internal(std::io::Error::other(format!(
                    "Failed to clear Meilisearch index: {e}"
                )))
            })?;

        // Index in batches of 500
        for chunk in docs.chunks(500) {
            self.index_plugins(chunk).await?;
        }

        tracing::info!("Indexed {count} plugins in Meilisearch");
        Ok(count)
    }
}

/// Builds denormalized plugin documents from the database for indexing.
pub async fn build_plugin_documents(pool: &PgPool) -> Result<Vec<PluginDocument>, AppError> {
    // Fetch all active plugins with author info
    let rows: Vec<PluginRow> = sqlx::query_as(
        "SELECT p.id, p.name, p.slug, p.short_description, p.description,
                p.author_id, u.username AS author_username,
                p.license, p.downloads_total,
                p.created_at, p.updated_at
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.is_active = true",
    )
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    if rows.is_empty() {
        return Ok(Vec::new());
    }

    let plugin_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();

    // Batch-load review stats
    let review_stat_rows: Vec<ReviewStatRow> = sqlx::query_as(
        "SELECT plugin_id,
                COUNT(*) FILTER (WHERE is_hidden = FALSE) AS review_count,
                COALESCE(AVG(rating::float8) FILTER (WHERE is_hidden = FALSE), 0.0) AS average_rating
         FROM reviews
         WHERE plugin_id = ANY($1)
         GROUP BY plugin_id",
    )
    .bind(&plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut review_stats_map: std::collections::HashMap<Uuid, (i64, f64)> =
        std::collections::HashMap::new();
    for stat in review_stat_rows {
        review_stats_map.insert(stat.plugin_id, (stat.review_count, stat.average_rating));
    }

    // Batch-load categories
    let cat_rows: Vec<PluginCategoryRow> = sqlx::query_as(
        "SELECT pc.plugin_id, c.name AS category_name, c.slug AS category_slug
         FROM plugin_categories pc
         JOIN categories c ON pc.category_id = c.id
         WHERE pc.plugin_id = ANY($1)",
    )
    .bind(&plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut categories_map: std::collections::HashMap<Uuid, (Vec<String>, Vec<String>)> =
        std::collections::HashMap::new();
    for row in cat_rows {
        let entry = categories_map.entry(row.plugin_id).or_default();
        entry.0.push(row.category_name);
        entry.1.push(row.category_slug);
    }

    // Batch-load platforms per plugin (via versions → binaries)
    let platform_rows: Vec<PlatformRow> = sqlx::query_as(
        "SELECT DISTINCT v.plugin_id, b.platform
         FROM binaries b
         JOIN versions v ON b.version_id = v.id
         WHERE v.plugin_id = ANY($1)",
    )
    .bind(&plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut platforms_map: std::collections::HashMap<Uuid, Vec<String>> =
        std::collections::HashMap::new();
    for row in platform_rows {
        platforms_map
            .entry(row.plugin_id)
            .or_default()
            .push(row.platform);
    }

    // Batch-load pumpkin version ranges per plugin
    let version_rows: Vec<PumpkinVersionRow> = sqlx::query_as(
        "SELECT DISTINCT plugin_id, pumpkin_version_min, pumpkin_version_max
         FROM versions
         WHERE plugin_id = ANY($1) AND is_yanked = false",
    )
    .bind(&plugin_ids)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut pumpkin_versions_map: std::collections::HashMap<Uuid, Vec<String>> =
        std::collections::HashMap::new();
    for row in version_rows {
        let versions = &mut pumpkin_versions_map.entry(row.plugin_id).or_default();
        if let Some(ref min) = row.pumpkin_version_min {
            if !versions.contains(min) {
                versions.push(min.clone());
            }
        }
        if let Some(ref max) = row.pumpkin_version_max {
            if !versions.contains(max) {
                versions.push(max.clone());
            }
        }
    }

    let docs = rows
        .into_iter()
        .map(|row| {
            let (categories, category_slugs) = categories_map.remove(&row.id).unwrap_or_default();
            let platforms = platforms_map.remove(&row.id).unwrap_or_default();
            let pumpkin_versions = pumpkin_versions_map.remove(&row.id).unwrap_or_default();

            let (review_count, average_rating) = review_stats_map
                .get(&row.id)
                .copied()
                .unwrap_or((0, 0.0));

            PluginDocument {
                id: row.id.to_string(),
                name: row.name,
                slug: row.slug,
                short_description: row.short_description,
                description: row.description,
                author_username: row.author_username,
                author_id: row.author_id.to_string(),
                license: row.license,
                downloads_total: row.downloads_total,
                categories,
                category_slugs,
                platforms,
                pumpkin_versions,
                created_at_timestamp: row.created_at.timestamp(),
                updated_at_timestamp: row.updated_at.timestamp(),
                average_rating,
                review_count,
            }
        })
        .collect();

    Ok(docs)
}

/// Builds a single plugin document from the database for incremental indexing.
pub async fn build_single_plugin_document(
    pool: &PgPool,
    plugin_id: Uuid,
) -> Result<Option<PluginDocument>, AppError> {
    let row: Option<PluginRow> = sqlx::query_as(
        "SELECT p.id, p.name, p.slug, p.short_description, p.description,
                p.author_id, u.username AS author_username,
                p.license, p.downloads_total,
                p.created_at, p.updated_at
         FROM plugins p
         JOIN users u ON p.author_id = u.id
         WHERE p.id = $1 AND p.is_active = true",
    )
    .bind(plugin_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    let row = match row {
        Some(r) => r,
        None => return Ok(None),
    };

    let cat_rows: Vec<PluginCategoryRow> = sqlx::query_as(
        "SELECT pc.plugin_id, c.name AS category_name, c.slug AS category_slug
         FROM plugin_categories pc
         JOIN categories c ON pc.category_id = c.id
         WHERE pc.plugin_id = $1",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let categories: Vec<String> = cat_rows.iter().map(|r| r.category_name.clone()).collect();
    let category_slugs: Vec<String> = cat_rows.iter().map(|r| r.category_slug.clone()).collect();

    let platform_rows: Vec<PlatformRow> = sqlx::query_as(
        "SELECT DISTINCT v.plugin_id, b.platform
         FROM binaries b
         JOIN versions v ON b.version_id = v.id
         WHERE v.plugin_id = $1",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let platforms: Vec<String> = platform_rows.into_iter().map(|r| r.platform).collect();

    let version_rows: Vec<PumpkinVersionRow> = sqlx::query_as(
        "SELECT DISTINCT plugin_id, pumpkin_version_min, pumpkin_version_max
         FROM versions
         WHERE plugin_id = $1 AND is_yanked = false",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let mut pumpkin_versions: Vec<String> = Vec::new();
    for vr in version_rows {
        if let Some(ref min) = vr.pumpkin_version_min {
            if !pumpkin_versions.contains(min) {
                pumpkin_versions.push(min.clone());
            }
        }
        if let Some(ref max) = vr.pumpkin_version_max {
            if !pumpkin_versions.contains(max) {
                pumpkin_versions.push(max.clone());
            }
        }
    }

    let review_stat: Option<ReviewStatRow> = sqlx::query_as(
        "SELECT plugin_id,
                COUNT(*) FILTER (WHERE is_hidden = FALSE) AS review_count,
                COALESCE(AVG(rating::float8) FILTER (WHERE is_hidden = FALSE), 0.0) AS average_rating
         FROM reviews
         WHERE plugin_id = $1
         GROUP BY plugin_id",
    )
    .bind(plugin_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    let (review_count, average_rating) = review_stat
        .map(|s| (s.review_count, s.average_rating))
        .unwrap_or((0, 0.0));

    Ok(Some(PluginDocument {
        id: row.id.to_string(),
        name: row.name,
        slug: row.slug,
        short_description: row.short_description,
        description: row.description,
        author_username: row.author_username,
        author_id: row.author_id.to_string(),
        license: row.license,
        downloads_total: row.downloads_total,
        categories,
        category_slugs,
        platforms,
        pumpkin_versions,
        created_at_timestamp: row.created_at.timestamp(),
        updated_at_timestamp: row.updated_at.timestamp(),
        average_rating,
        review_count,
    }))
}

// ── SQL Row Types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct PluginRow {
    id: Uuid,
    name: String,
    slug: String,
    short_description: Option<String>,
    description: Option<String>,
    author_id: Uuid,
    author_username: String,
    license: Option<String>,
    downloads_total: i64,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, sqlx::FromRow)]
struct PluginCategoryRow {
    #[allow(dead_code)]
    plugin_id: Uuid,
    category_name: String,
    category_slug: String,
}

#[derive(Debug, sqlx::FromRow)]
struct ReviewStatRow {
    #[allow(dead_code)]
    plugin_id: Uuid,
    review_count: i64,
    average_rating: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct PlatformRow {
    #[allow(dead_code)]
    plugin_id: Uuid,
    platform: String,
}

#[derive(Debug, sqlx::FromRow)]
struct PumpkinVersionRow {
    #[allow(dead_code)]
    plugin_id: Uuid,
    pumpkin_version_min: Option<String>,
    pumpkin_version_max: Option<String>,
}

/// Sanitizes a user-provided filter value to prevent Meilisearch filter injection.
/// Only allows alphanumeric, dots, hyphens, and underscores.
fn sanitize_filter_value(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect()
}
