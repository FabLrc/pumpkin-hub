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
    #[sqlx(rename = "name")]
    project_name: String,
    flow_data: serde_json::Value,
}

struct BuildJob {
    id: Uuid,
    project_id: Uuid,
    build_number: i32,
    project_slug: String,
    project_name: String,
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
}

impl Default for StudioConfig {
    fn default() -> Self {
        Self {
            build_timeout_seconds: 300,
            s3_prefix: "studio-builds".to_string(),
            max_build_concurrency: 2,
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
                     pp.slug, pp.name, pp.flow_data"#,
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
        project_name: row.project_name,
        flow_data: row.flow_data,
    };

    tracing::info!(
        build_id = %job.id,
        project = %job.project_slug,
        build = %job.build_number,
        "Build worker picked up job"
    );

    let tmp_dir = tempfile::Builder::new()
        .prefix("pumpkin-build-")
        .tempdir()
        .map_err(|e| AppError::internal(std::io::Error::other(format!("tempdir: {e}"))))?;

    let build_path = tmp_dir.path().join(&job.project_slug);
    let src_path = build_path.join("src");

    std::fs::create_dir_all(&src_path)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("mkdir src: {e}"))))?;

    let cargo_toml = generate_cargo_toml(&job.project_slug);
    std::fs::write(build_path.join("Cargo.toml"), &cargo_toml)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("write Cargo.toml: {e}"))))?;

    let source = match code_generator::generate_rust_source(&job.project_slug, &job.flow_data) {
        Ok(s) => s,
        Err(e) => {
            mark_build_failed(pool, job.id, &format!("Code generation error: {e}")).await?;
            let _ = tmp_dir.close();
            return Ok(());
        }
    };

    std::fs::write(src_path.join("lib.rs"), &source)
        .map_err(|e| AppError::internal(std::io::Error::other(format!("write lib.rs: {e}"))))?;

    let timeout_duration = std::time::Duration::from_secs(config.build_timeout_seconds);
    let build_log = compile_wasm(&build_path, timeout_duration).await;

    if let Err(ref log) = build_log {
        mark_build_failed(pool, job.id, log).await?;
        let _ = tmp_dir.close();
        return Ok(());
    }

    let build_log = build_log.unwrap_or_default();

    let wasm_filename = format!("{}.wasm", job.project_slug.replace('-', "_"));
    let wasm_path = build_path
        .join("target")
        .join("wasm32-wasip1")
        .join("release")
        .join(&wasm_filename);

    if !wasm_path.exists() {
        let msg = format!("WASM binary not found after build\n{build_log}");
        mark_build_failed(pool, job.id, &msg).await?;
        let _ = tmp_dir.close();
        return Ok(());
    }

    let wasm_bytes = tokio::fs::read(&wasm_path)
        .await
        .map_err(|e| AppError::internal(std::io::Error::other(format!("read wasm: {e}"))))?;

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
    .bind(&build_log)
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

    cleanup_old_builds(pool, storage, job.project_id, config).await?;

    tracing::info!(
        build_id = %job.id,
        project = %job.project_slug,
        "Build completed successfully"
    );

    let _ = tmp_dir.close();
    Ok(())
}

async fn mark_build_failed(pool: &PgPool, build_id: Uuid, error_message: &str) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE build_jobs
         SET status = 'failed', error_message = $2, completed_at = now()
         WHERE id = $1",
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
    _config: &StudioConfig,
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
