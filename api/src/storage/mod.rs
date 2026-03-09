use std::time::Duration;

use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::{config::Region, presigning::PresigningConfig, primitives::ByteStream, Client};

use crate::config::S3Config;

/// S3-compatible object storage client.
/// Works with MinIO (development) and Cloudflare R2 (production).
#[derive(Clone)]
pub struct ObjectStorage {
    client: Client,
    bucket: String,
    /// Internal S3 endpoint URL (e.g. `http://minio-dev:9000`).
    endpoint_url: String,
    /// Optional browser-reachable URL that replaces `endpoint_url` in
    /// pre-signed download links (e.g. `http://localhost:9000` in dev).
    public_url: Option<String>,
}

/// Pre-signed download response returned to callers.
pub struct PresignedDownload {
    pub url: String,
    pub expires_in_seconds: u64,
}

/// Default duration for pre-signed download URLs.
const PRESIGNED_URL_TTL_SECONDS: u64 = 3600;

impl ObjectStorage {
    /// Builds an S3 client from application config.
    pub async fn from_config(config: &S3Config) -> Self {
        let credentials = Credentials::new(
            &config.access_key_id,
            &config.secret_access_key,
            None,
            None,
            "pumpkin-hub-env",
        );

        let sdk_config = aws_config::defaults(BehaviorVersion::latest())
            .endpoint_url(&config.endpoint_url)
            .credentials_provider(credentials)
            .region(Region::new(config.region.clone()))
            .load()
            .await;

        let s3_config = aws_sdk_s3::config::Builder::from(&sdk_config)
            .force_path_style(config.force_path_style)
            .build();

        let client = Client::from_conf(s3_config);

        Self {
            client,
            bucket: config.bucket.clone(),
            endpoint_url: config.endpoint_url.clone(),
            public_url: config.public_url.clone(),
        }
    }

    /// Uploads raw bytes to the configured bucket.
    /// Returns the storage key on success.
    pub async fn put_object(
        &self,
        key: &str,
        body: Vec<u8>,
        content_type: &str,
    ) -> Result<(), aws_sdk_s3::error::SdkError<aws_sdk_s3::operation::put_object::PutObjectError>>
    {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(body))
            .content_type(content_type)
            .send()
            .await?;
        Ok(())
    }

    /// Generates a time-limited pre-signed URL for downloading an object.
    /// When `public_url` is configured the internal S3 endpoint is replaced
    /// so the URL is reachable from the browser.
    pub async fn presigned_download_url(
        &self,
        key: &str,
    ) -> Result<PresignedDownload, Box<dyn std::error::Error + Send + Sync>> {
        let presigning =
            PresigningConfig::expires_in(Duration::from_secs(PRESIGNED_URL_TTL_SECONDS))?;

        let presigned_request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presigning)
            .await?;

        let raw_url = presigned_request.uri().to_string();

        // Rewrite the internal endpoint (e.g. http://minio-dev:9000) with the
        // browser-reachable public URL (e.g. http://localhost:9000) so the
        // download link works outside the Docker network.
        let url = match &self.public_url {
            Some(public) => raw_url.replacen(&self.endpoint_url, public, 1),
            None => raw_url,
        };

        Ok(PresignedDownload {
            url,
            expires_in_seconds: PRESIGNED_URL_TTL_SECONDS,
        })
    }

    /// Deletes an object from the bucket.
    pub async fn delete_object(
        &self,
        key: &str,
    ) -> Result<
        (),
        aws_sdk_s3::error::SdkError<aws_sdk_s3::operation::delete_object::DeleteObjectError>,
    > {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;
        Ok(())
    }

    /// Builds the canonical S3 object key for a plugin binary.
    /// Pattern: `plugins/{slug}/{version}/{platform}/{file_name}`
    pub fn build_storage_key(
        plugin_slug: &str,
        version: &str,
        platform: &str,
        file_name: &str,
    ) -> String {
        format!("plugins/{plugin_slug}/{version}/{platform}/{file_name}")
    }
}
