use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Json,
};
use sqlx::FromRow;
use uuid::Uuid;

use crate::routes::plugins::handlers::require_ownership;
use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{
    self, MediaListResponse, MediaResponse, MediaUploadResponse, ReorderMediaRequest,
    UpdateMediaRequest,
};

// ── SQL Row Type ────────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
struct MediaRow {
    id: Uuid,
    media_type: String,
    file_name: String,
    file_size: i64,
    content_type: String,
    storage_key: String,
    thumbnail_key: Option<String>,
    caption: Option<String>,
    sort_order: i32,
    uploaded_at: chrono::DateTime<chrono::Utc>,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/// Builds the S3 storage key for a media item.
fn build_media_storage_key(plugin_slug: &str, media_id: &Uuid, file_name: &str) -> String {
    format!("plugins/{plugin_slug}/media/{media_id}/{file_name}")
}

/// Converts a DB row to a response DTO with presigned URLs.
async fn row_to_response(row: &MediaRow, state: &AppState) -> Result<MediaResponse, AppError> {
    let url = state
        .storage
        .presigned_download_url(&row.storage_key)
        .await
        .map_err(|e| AppError::internal(std::io::Error::other(e.to_string())))?
        .url;

    let thumbnail_url = if let Some(ref tk) = row.thumbnail_key {
        Some(
            state
                .storage
                .presigned_download_url(tk)
                .await
                .map_err(|e| AppError::internal(std::io::Error::other(e.to_string())))?
                .url,
        )
    } else {
        None
    };

    Ok(MediaResponse {
        id: row.id,
        media_type: row.media_type.clone(),
        file_name: row.file_name.clone(),
        file_size: row.file_size,
        content_type: row.content_type.clone(),
        url,
        thumbnail_url,
        caption: row.caption.clone(),
        sort_order: row.sort_order,
        uploaded_at: row.uploaded_at,
    })
}

/// Fetches plugin_id and author_id by slug.
async fn fetch_plugin_info(
    pool: &sqlx::PgPool,
    slug: &str,
) -> Result<(Uuid, Uuid, String), AppError> {
    #[derive(FromRow)]
    struct PluginInfo {
        id: Uuid,
        author_id: Uuid,
        slug: String,
    }

    let info: PluginInfo = sqlx::query_as(
        "SELECT id, author_id, slug FROM plugins WHERE slug = $1 AND is_active = true",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    Ok((info.id, info.author_id, info.slug))
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/v1/plugins/{slug}/media
/// Lists all media items for a plugin's gallery (public).
pub async fn list_media(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<MediaListResponse>, AppError> {
    let pool = &state.db;
    let (plugin_id, _, _) = fetch_plugin_info(pool, &slug).await?;

    let rows: Vec<MediaRow> = sqlx::query_as(
        "SELECT id, media_type, file_name, file_size, content_type,
                storage_key, thumbnail_key, caption, sort_order, uploaded_at
         FROM plugin_media
         WHERE plugin_id = $1
         ORDER BY sort_order ASC, uploaded_at ASC",
    )
    .bind(plugin_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    let total = rows.len() as i64;
    let mut media = Vec::with_capacity(rows.len());
    for row in &rows {
        media.push(row_to_response(row, &state).await?);
    }

    Ok(Json(MediaListResponse {
        plugin_slug: slug,
        total,
        media,
    }))
}

/// POST /api/v1/plugins/{slug}/media
/// Upload a new media item (image or video). Requires plugin ownership.
pub async fn upload_media(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<MediaUploadResponse>), AppError> {
    auth.require_permission("upload")?;
    let pool = &state.db;
    let (plugin_id, author_id, plugin_slug) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    // Check media count limit
    let current_count: Option<i64> =
        sqlx::query_scalar("SELECT COUNT(*) FROM plugin_media WHERE plugin_id = $1")
            .bind(plugin_id)
            .fetch_one(pool)
            .await
            .map_err(AppError::internal)?;

    if current_count.unwrap_or(0) >= dto::max_media_per_plugin() {
        return Err(AppError::UnprocessableEntity(format!(
            "Maximum of {} media items per plugin reached",
            dto::max_media_per_plugin()
        )));
    }

    // Parse multipart fields
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;
    let mut content_type = String::new();
    let mut caption: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::UnprocessableEntity(format!("Failed to read multipart field: {e}"))
    })? {
        let field_name = field.name().unwrap_or_default().to_string();

        match field_name.as_str() {
            "file" => {
                file_name = field
                    .file_name()
                    .map(|n| n.to_string())
                    .or_else(|| Some("media".to_string()));

                if let Some(ct) = field.content_type() {
                    content_type = ct.to_string();
                }

                let bytes = field.bytes().await.map_err(|e| {
                    AppError::UnprocessableEntity(format!("Failed to read file data: {e}"))
                })?;

                if bytes.is_empty() {
                    return Err(AppError::UnprocessableEntity(
                        "File must not be empty".into(),
                    ));
                }

                file_data = Some(bytes.to_vec());
            }
            "caption" => {
                caption = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| {
                            AppError::UnprocessableEntity(format!(
                                "Failed to read caption field: {e}"
                            ))
                        })?
                        .trim()
                        .to_string(),
                );
            }
            _ => {} // Ignore unknown fields
        }
    }

    // Validate required fields
    let file_data = file_data
        .ok_or_else(|| AppError::UnprocessableEntity("Missing required field: file".into()))?;
    let file_name = file_name.unwrap_or_else(|| "media".to_string());

    // Validate content type → determine media_type
    let media_type = dto::validate_media_content_type(&content_type)?;
    dto::validate_media_size(file_data.len() as u64, media_type)?;
    dto::validate_media_file_name(&file_name)?;

    // Generate ID & storage key
    let media_id = Uuid::new_v4();
    let storage_key = build_media_storage_key(&plugin_slug, &media_id, &file_name);

    let file_size = file_data.len() as i64;

    // Upload to S3
    state
        .storage
        .put_object(&storage_key, file_data, &content_type)
        .await
        .map_err(|e| AppError::internal(std::io::Error::other(e.to_string())))?;

    // Determine next sort order
    let next_sort: Option<i32> = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM plugin_media WHERE plugin_id = $1",
    )
    .bind(plugin_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    let sort_order = next_sort.unwrap_or(0);

    // Insert into database
    let row: MediaRow = sqlx::query_as(
        "INSERT INTO plugin_media (id, plugin_id, uploaded_by, media_type, file_name, file_size,
                                    content_type, storage_key, caption, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, media_type, file_name, file_size, content_type,
                   storage_key, thumbnail_key, caption, sort_order, uploaded_at",
    )
    .bind(media_id)
    .bind(plugin_id)
    .bind(auth.user_id)
    .bind(media_type)
    .bind(&file_name)
    .bind(file_size)
    .bind(&content_type)
    .bind(&storage_key)
    .bind(&caption)
    .bind(sort_order)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    let response = row_to_response(&row, &state).await?;

    Ok((
        StatusCode::CREATED,
        Json(MediaUploadResponse { media: response }),
    ))
}

/// PATCH /api/v1/plugins/{slug}/media/{media_id}
/// Update caption or sort_order for a media item. Requires ownership.
pub async fn update_media(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((slug, media_id)): Path<(String, Uuid)>,
    Json(body): Json<UpdateMediaRequest>,
) -> Result<Json<MediaResponse>, AppError> {
    body.validate()?;
    let pool = &state.db;
    let (_plugin_id, author_id, _) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    let row: MediaRow = sqlx::query_as(
        "UPDATE plugin_media
         SET caption = COALESCE($1, caption),
             sort_order = COALESCE($2, sort_order)
         WHERE id = $3
         RETURNING id, media_type, file_name, file_size, content_type,
                   storage_key, thumbnail_key, caption, sort_order, uploaded_at",
    )
    .bind(&body.caption)
    .bind(body.sort_order)
    .bind(media_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    row_to_response(&row, &state).await.map(Json)
}

/// PUT /api/v1/plugins/{slug}/media/reorder
/// Reorder all media items. Requires ownership.
pub async fn reorder_media(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(slug): Path<String>,
    Json(body): Json<ReorderMediaRequest>,
) -> Result<StatusCode, AppError> {
    let pool = &state.db;
    let (plugin_id, author_id, _) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    if body.media_ids.is_empty() {
        return Err(AppError::UnprocessableEntity(
            "media_ids must not be empty".into(),
        ));
    }

    let mut tx = pool.begin().await.map_err(AppError::internal)?;

    for (index, media_id) in body.media_ids.iter().enumerate() {
        let rows_affected =
            sqlx::query("UPDATE plugin_media SET sort_order = $1 WHERE id = $2 AND plugin_id = $3")
                .bind(index as i32)
                .bind(media_id)
                .bind(plugin_id)
                .execute(&mut *tx)
                .await
                .map_err(AppError::internal)?
                .rows_affected();

        if rows_affected == 0 {
            return Err(AppError::UnprocessableEntity(format!(
                "Media item {media_id} not found for this plugin"
            )));
        }
    }

    tx.commit().await.map_err(AppError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/v1/plugins/{slug}/media/{media_id}
/// Delete a media item and its S3 objects. Requires ownership.
pub async fn delete_media(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((slug, media_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, AppError> {
    let pool = &state.db;
    let (_plugin_id, author_id, _) = fetch_plugin_info(pool, &slug).await?;
    require_ownership(&auth, author_id)?;

    // Fetch storage keys before deleting
    #[derive(FromRow)]
    struct StorageKeys {
        storage_key: String,
        thumbnail_key: Option<String>,
    }

    let keys: StorageKeys = sqlx::query_as(
        "DELETE FROM plugin_media WHERE id = $1
         RETURNING storage_key, thumbnail_key",
    )
    .bind(media_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    // Fire-and-forget S3 cleanup
    let storage = state.storage.clone();
    let sk = keys.storage_key;
    let tk = keys.thumbnail_key;
    tokio::spawn(async move {
        let _ = storage.delete_object(&sk).await;
        if let Some(tk) = tk {
            let _ = storage.delete_object(&tk).await;
        }
    });

    Ok(StatusCode::NO_CONTENT)
}
