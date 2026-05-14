use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::error::AppError;
use crate::services::code_generator;
use crate::storage::ObjectStorage;

#[derive(FromRow)]
struct BuildJobRow {
    id: Uuid,
    project_id: Uuid,
    build_number: i32,
    #[sqlx(rename = "slug")]
    project_slug: String,
    flow_data: serde_json::Value,
}

struct BuildJob {
    id: Uuid,
    project_id: Uuid,
    build_number: i32,
    project_slug: String,
    flow_data: serde_json::Value,
}

pub async fn run_build_worker(pool: PgPool, storage: ObjectStorage, studio_config: StudioConfig) {
    let poll_interval = std::time::Duration::from_secs(5);
    loop {
        if let Err(e) = process_next_build(&pool, &storage, &studio_config).await {
            tracing::warn!(error = %e, "Build worker iteration failed");
        }
        tokio::time::sleep(poll_interval).await;
    }
}

#[derive(Clone)]
pub struct StudioConfig {
    pub build_timeout_seconds: u64,
    pub s3_prefix: String,
    pub max_build_concurrency: u32,
    pub max_artifact_size_bytes: u64,
}

impl StudioConfig {
    pub fn from_env() -> Self {
        let build_timeout = std::env::var("STUDIO_BUILD_TIMEOUT_SECONDS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300);

        let max_artifact = std::env::var("STUDIO_MAX_ARTIFACT_SIZE_BYTES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(50 * 1024 * 1024); // 50MB default

        Self {
            build_timeout_seconds: build_timeout,
            s3_prefix: std::env::var("STUDIO_S3_PREFIX")
                .unwrap_or_else(|_| "studio-builds".to_string()),
            max_build_concurrency: std::env::var("STUDIO_MAX_BUILD_CONCURRENCY")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(2),
            max_artifact_size_bytes: max_artifact,
        }
    }
}

async fn process_next_build(
    pool: &PgPool,
    storage: &ObjectStorage,
    config: &StudioConfig,
) -> Result<(), AppError> {
    let row: Option<BuildJobRow> = sqlx::query_as(
        r#"UPDATE build_jobs bj
           SET status = 'running', started_at = now()
           FROM plugin_projects pp
           WHERE bj.id = (
               SELECT id FROM build_jobs
               WHERE status = 'queued'
               ORDER BY created_at ASC
               LIMIT 1
               FOR UPDATE SKIP LOCKED
           )
           AND pp.id = bj.project_id
            RETURNING bj.id, bj.project_id, bj.build_number,
                      pp.slug, pp.flow_data"#,
    )
    .fetch_optional(pool)
    .await
    .map_err(AppError::internal)?;

    let row = match row {
        Some(r) => r,
        None => return Ok(()),
    };

    let job = BuildJob {
        id: row.id,
        project_id: row.project_id,
        build_number: row.build_number,
        project_slug: row.project_slug,
        flow_data: row.flow_data,
    };

    tracing::info!(
        build_id = %job.id,
        project = %job.project_slug,
        build = %job.build_number,
        "Build worker picked up job"
    );

    // Use RAII: TempDir auto-cleans on drop. Never call close() manually.
    let tmp_dir = tempfile::Builder::new()
        .prefix("pumpkin-build-")
        .tempdir()
        .map_err(|e| AppError::internal(std::io::Error::other(format!("tempdir: {e}"))))?;

    let build_path = tmp_dir.path().join(&job.project_slug);
    let src_path = build_path.join("src");

    let result = try_build(&job, &build_path, &src_path, pool, storage, config).await;

    // If the build failed AND we didn't already mark it as failed, mark it now.
    // This catch covers S3 upload errors, unexpected panics, etc.
    if let Err(ref e) = result {
        let msg = format!("Build error: {e}");
        // Non-blocking mark — ignore secondary errors
        let _ = mark_build_failed(pool, job.id, &msg).await;
    }

    // tmp_dir drops here → RAII cleanup
    result
}

async fn try_build(
    job: &BuildJob,
    build_path: &std::path::Path,
    src_path: &std::path::Path,
    pool: &PgPool,
    storage: &ObjectStorage,
    config: &StudioConfig,
) -> Result<(), AppError> {
    std::fs::create_dir_all(src_path)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("mkdir src: {e}"))))?;

    let cargo_toml = generate_cargo_toml(&job.project_slug);
    std::fs::write(build_path.join("Cargo.toml"), &cargo_toml)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("write Cargo.toml: {e}"))))?;

    let source = code_generator::generate_rust_source(&job.project_slug, &job.flow_data)?;

    std::fs::write(src_path.join("lib.rs"), &source)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("write lib.rs: {e}"))))?;

    let timeout_duration = std::time::Duration::from_secs(config.build_timeout_seconds);
    match compile_wasm(build_path, timeout_duration).await {
        Err(log) => {
            let msg = log.chars().take(5000).collect::<String>();
            return Err(AppError::UnprocessableEntity(msg));
        }
        Ok(log) => {
            let truncated_log = log.chars().take(10000).collect::<String>();

            let wasm_filename = format!("{}.wasm", job.project_slug.replace('-', "_"));
            let wasm_path = build_path
                .join("target")
                .join("wasm32-wasip1")
                .join("release")
                .join(&wasm_filename);

            if !wasm_path.exists() {
                return Err(AppError::UnprocessableEntity(format!(
                    "WASM binary not found after build\n{truncated_log}"
                )));
            }

            let wasm_bytes = tokio::fs::read(&wasm_path)
                .await
                .map_err(|e| AppError::internal(std::io::Error::other(format!("read wasm: {e}"))))?;

            if (wasm_bytes.len() as u64) > config.max_artifact_size_bytes {
                return Err(AppError::UnprocessableEntity(format!(
                    "WASM artifact too large ({} bytes, max {})",
                    wasm_bytes.len(),
                    config.max_artifact_size_bytes
                )));
            }

            let checksum = {
                use sha2::Digest;
                let mut hasher = sha2::Sha256::new();
                hasher.update(&wasm_bytes);
                format!("{:x}", hasher.finalize())
            };

            let file_size = wasm_bytes.len() as i64;
            let storage_key = format!(
                "{}/{}/{}/{}",
                config.s3_prefix, job.project_id, job.build_number, wasm_filename
            );

            // Upload to S3 — if this fails, the outer result handler in process_next_build
            // will call mark_build_failed
            storage
                .put_object(&storage_key, wasm_bytes, "application/wasm")
                .await
                .map_err(|e| AppError::internal(std::io::Error::other(format!("s3 upload: {e}"))))?;

            sqlx::query(
                "UPDATE build_jobs
                 SET status = 'success', logs = $2, artifact_storage_key = $3,
                     artifact_checksum_sha256 = $4, artifact_file_size = $5,
                     completed_at = now()
                 WHERE id = $1",
            )
            .bind(job.id)
            .bind(&truncated_log)
            .bind(&storage_key)
            .bind(&checksum)
            .bind(file_size)
            .execute(pool)
            .await
            .map_err(AppError::internal)?;

            sqlx::query(
                "UPDATE plugin_projects SET status = 'draft', updated_at = now() WHERE id = $1",
            )
            .bind(job.project_id)
            .execute(pool)
            .await
            .map_err(AppError::internal)?;

            cleanup_old_builds(pool, storage, job.project_id).await?;

            tracing::info!(
                build_id = %job.id,
                project = %job.project_slug,
                "Build completed successfully"
            );

            Ok(())
        }
    }
}

async fn mark_build_failed(pool: &PgPool, build_id: Uuid, error_message: &str) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE build_jobs
         SET status = 'failed', error_message = $2, completed_at = now()
         WHERE id = $1 AND status NOT IN ('success', 'failed')",
    )
    .bind(build_id)
    .bind(error_message)
    .execute(pool)
    .await
    .map_err(AppError::internal)?;

    sqlx::query(
        "UPDATE plugin_projects pp
         SET status = 'draft', updated_at = now()
         FROM build_jobs bj
         WHERE bj.id = $1 AND pp.id = bj.project_id",
    )
    .bind(build_id)
    .execute(pool)
    .await
    .map_err(AppError::internal)?;

    tracing::warn!(build_id = %build_id, "Build failed: {error_message}");
    Ok(())
}

async fn compile_wasm(
    build_path: &std::path::Path,
    timeout: std::time::Duration,
) -> Result<String, String> {
    let output = tokio::time::timeout(
        timeout,
        tokio::process::Command::new("cargo")
            .arg("build")
            .arg("--target")
            .arg("wasm32-wasip1")
            .arg("--release")
            .current_dir(build_path)
            .output(),
    )
    .await
    .map_err(|_| "Build timed out".to_string())?
    .map_err(|e| format!("Failed to spawn cargo: {e}"))?;

    let log = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(log)
    } else {
        Err(format!("Build failed (exit: {})\n{log}", output.status))
    }
}

async fn cleanup_old_builds(
    pool: &PgPool,
    storage: &ObjectStorage,
    project_id: Uuid,
) -> Result<(), AppError> {
    #[derive(FromRow)]
    struct OldBuildRow {
        id: Uuid,
        artifact_storage_key: Option<String>,
    }

    let old_builds: Vec<OldBuildRow> = sqlx::query_as(
        r#"SELECT bj.id, bj.artifact_storage_key
           FROM build_jobs bj
           WHERE bj.project_id = $1
             AND bj.status = 'success'
             AND bj.build_number < (
                 SELECT MIN(sub.build_number) FROM (
                     SELECT b2.build_number FROM build_jobs b2
                     WHERE b2.project_id = $1 AND b2.status = 'success'
                     ORDER BY b2.build_number DESC
                     LIMIT 3
                 ) sub
             )
             AND bj.artifact_storage_key IS NOT NULL"#,
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::internal)?;

    for build in old_builds {
        if let Some(ref key) = build.artifact_storage_key {
            if !key.is_empty() {
                let _ = storage.delete_object(key).await;
            }
        }
        let _ = sqlx::query("DELETE FROM build_jobs WHERE id = $1")
            .bind(build.id)
            .execute(pool)
            .await;
    }

    Ok(())
}

fn generate_cargo_toml(slug: &str) -> String {
    let crate_name = slug.replace('-', "_");
    format!(
        r#"[package]
name = "{crate_name}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
pumpkin-plugin-api = {{ git = "https://github.com/Pumpkin-MC/Pumpkin" }}
"#,
        crate_name = crate_name
    )
}
