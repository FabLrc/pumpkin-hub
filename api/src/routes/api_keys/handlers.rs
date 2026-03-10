use axum::{
    extract::{Path, State},
    Json,
};
use rand::RngCore;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{auth::middleware::AuthUser, error::AppError, state::AppState};

use super::dto::{max_keys_per_user, ApiKeySummary, CreateApiKeyRequest, CreateApiKeyResponse};

const API_KEY_PREFIX: &str = "phub_";
const RAW_KEY_BYTE_LENGTH: usize = 32;

/// Generate a cryptographically random API key with the `phub_` prefix.
fn generate_raw_key() -> String {
    let mut bytes = [0u8; RAW_KEY_BYTE_LENGTH];
    rand::thread_rng().fill_bytes(&mut bytes);
    let encoded = hex::encode(bytes);
    format!("{API_KEY_PREFIX}{encoded}")
}

/// SHA-256 hash of the raw key for storage.
fn hash_key(raw_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    hex::encode(hasher.finalize())
}

/// Extract the visible prefix from a raw key (e.g. `phub_ab12cd34`).
fn extract_prefix(raw_key: &str) -> String {
    raw_key.chars().take(API_KEY_PREFIX.len() + 8).collect()
}

// ── POST /api-keys ────────────────────────────────────────────────────────

pub async fn create_api_key(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateApiKeyRequest>,
) -> Result<Json<CreateApiKeyResponse>, AppError> {
    body.validate().map_err(AppError::UnprocessableEntity)?;

    let pool = &state.db;

    // Enforce per-user key limit
    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM api_keys WHERE user_id = $1")
        .bind(auth.user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::internal)?;

    if count >= max_keys_per_user() {
        return Err(AppError::Conflict(format!(
            "Maximum {} API keys per user",
            max_keys_per_user()
        )));
    }

    let raw_key = generate_raw_key();
    let key_hash = hash_key(&raw_key);
    let key_prefix = extract_prefix(&raw_key);
    let name = body.name.trim().to_string();
    let permissions: Vec<String> = body.permissions;

    let row: (Uuid, chrono::DateTime<chrono::Utc>) = sqlx::query_as(
        "INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at",
    )
    .bind(auth.user_id)
    .bind(&name)
    .bind(&key_hash)
    .bind(&key_prefix)
    .bind(&permissions)
    .bind(body.expires_at)
    .fetch_one(pool)
    .await
    .map_err(AppError::internal)?;

    Ok(Json(CreateApiKeyResponse {
        id: row.0,
        name,
        key: raw_key,
        key_prefix,
        permissions,
        expires_at: body.expires_at,
        created_at: row.1,
    }))
}

// ── GET /api-keys ─────────────────────────────────────────────────────────

pub async fn list_api_keys(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<ApiKeySummary>>, AppError> {
    let rows = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            String,
            Vec<String>,
            Option<chrono::DateTime<chrono::Utc>>,
            Option<chrono::DateTime<chrono::Utc>>,
            chrono::DateTime<chrono::Utc>,
        ),
    >(
        "SELECT id, name, key_prefix, permissions, last_used_at, expires_at, created_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::internal)?;

    let keys: Vec<ApiKeySummary> = rows
        .into_iter()
        .map(|r| ApiKeySummary {
            id: r.0,
            name: r.1,
            key_prefix: r.2,
            permissions: r.3,
            last_used_at: r.4,
            expires_at: r.5,
            created_at: r.6,
        })
        .collect();

    Ok(Json(keys))
}

// ── DELETE /api-keys/:id ──────────────────────────────────────────────────

pub async fn revoke_api_key(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(key_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = sqlx::query("DELETE FROM api_keys WHERE id = $1 AND user_id = $2")
        .bind(key_id)
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .map_err(AppError::internal)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}
