pub mod pumpkin_binary;

use std::collections::HashMap;
use std::time::Duration;

use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::{config::Region, presigning::PresigningConfig, primitives::ByteStream, Client};

use crate::{config::S3Config, error::AppError};

/// S3-compatible object storage client.
/// Works with MinIO (development) and Cloudflare R2 (production).
#[derive(Clone)]
pub struct ObjectStorage {
    client: Client,
    /// Separate client configured with the public endpoint, used exclusively
    /// for generating presigned download URLs reachable from the browser.
    /// SigV4 includes the Host in the signature, so the presigning client
    /// **must** use the same host the browser will hit.
    presign_client: Client,
    has_public_presign_override: bool,
    public_base_url: Option<String>,
    force_path_style: bool,
    use_direct_public_urls: bool,
    bucket: String,
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
            .credentials_provider(credentials.clone())
            .region(Region::new(config.region.clone()))
            .load()
            .await;

        let s3_config = aws_sdk_s3::config::Builder::from(&sdk_config)
            .force_path_style(config.force_path_style)
            .build();

        let client = Client::from_conf(s3_config);

        // Build a second client used exclusively for generating pre-signed download URLs.
        // When use_direct_public_urls=true, S3_PUBLIC_URL is a CDN/custom-domain URL and is
        // NOT a valid S3 API endpoint — always fall back to the S3 API endpoint for presigning.
        // When use_direct_public_urls=false, S3_PUBLIC_URL may point to a browser-reachable S3
        // endpoint different from the internal one (e.g. virtual-hosted R2 subdomain).
        let presign_endpoint = if config.use_direct_public_urls {
            config.endpoint_url.as_str()
        } else {
            config.public_url.as_deref().unwrap_or(&config.endpoint_url)
        };

        let presign_sdk_config = aws_config::defaults(BehaviorVersion::latest())
            .endpoint_url(presign_endpoint)
            .credentials_provider(credentials)
            .region(Region::new(config.region.clone()))
            .load()
            .await;

        let presign_s3_config = aws_sdk_s3::config::Builder::from(&presign_sdk_config)
            .force_path_style(config.force_path_style)
            .build();

        let presign_client = Client::from_conf(presign_s3_config);

        let has_public_presign_override = !config.use_direct_public_urls
            && config
                .public_url
                .as_ref()
                .is_some_and(|public_url| public_url.trim() != config.endpoint_url.trim());

        let normalized_public_url = config
            .public_url
            .as_ref()
            .map(|url| url.trim_end_matches('/').to_string())
            .filter(|url| !url.is_empty())
            .and_then(|url| {
                if url.starts_with("http://") || url.starts_with("https://") {
                    Some(url)
                } else {
                    tracing::error!(
                        S3_PUBLIC_URL = %url,
                        "S3_PUBLIC_URL must start with 'https://' — direct public URLs are disabled. \
                         Add the scheme (e.g. https://{url})"
                    );
                    None
                }
            });

        let use_direct_public_urls =
            config.use_direct_public_urls && normalized_public_url.is_some();

        Self {
            client,
            presign_client,
            has_public_presign_override,
            public_base_url: normalized_public_url,
            force_path_style: config.force_path_style,
            use_direct_public_urls,
            bucket: config.bucket.clone(),
        }
    }

    async fn presign_download_with_client(
        client: &Client,
        bucket: &str,
        key: &str,
    ) -> Result<PresignedDownload, Box<dyn std::error::Error + Send + Sync>> {
        let presigning =
            PresigningConfig::expires_in(Duration::from_secs(PRESIGNED_URL_TTL_SECONDS))?;

        let presigned_request = client
            .get_object()
            .bucket(bucket)
            .key(key)
            .presigned(presigning)
            .await?;

        Ok(PresignedDownload {
            url: presigned_request.uri().to_string(),
            expires_in_seconds: PRESIGNED_URL_TTL_SECONDS,
        })
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
    /// Uses a dedicated client configured with the public endpoint so the
    /// SigV4 signature matches the host the browser will actually contact.
    pub async fn presigned_download_url(
        &self,
        key: &str,
    ) -> Result<PresignedDownload, Box<dyn std::error::Error + Send + Sync>> {
        match Self::presign_download_with_client(&self.presign_client, &self.bucket, key).await {
            Ok(presigned) => Ok(presigned),
            Err(public_err) if self.has_public_presign_override => {
                tracing::warn!(
                    error = %public_err,
                    bucket = %self.bucket,
                    %key,
                    "Presigning with public endpoint failed, retrying with internal endpoint"
                );

                Self::presign_download_with_client(&self.client, &self.bucket, key).await
            }
            Err(err) => Err(err),
        }
    }

    /// Builds a direct browser URL from the configured public base URL.
    /// Useful for public buckets (gallery images, plugin icons) where presigning
    /// may be unnecessary or incompatible with custom/public endpoints.
    pub fn public_object_url(&self, key: &str) -> Option<String> {
        if !self.use_direct_public_urls {
            return None;
        }

        self.public_base_url.as_ref().map(|base| {
            let trimmed_key = key.trim_start_matches('/');
            if self.force_path_style {
                format!("{base}/{}/{trimmed_key}", self.bucket)
            } else {
                format!("{base}/{trimmed_key}")
            }
        })
    }

    /// Resolves an optional storage key to a browser-reachable URL.
    /// Prefers direct public URLs (no expiry), falls back to presigned URLs.
    /// Returns `None` when the key itself is `None`.
    pub async fn resolve_url(&self, key: Option<&str>) -> Option<String> {
        let key = key?;
        if let Some(url) = self.public_object_url(key) {
            return Some(url);
        }
        match self.presigned_download_url(key).await {
            Ok(presigned) => Some(presigned.url),
            Err(e) => {
                tracing::warn!(error = %e, %key, "Failed to generate presigned URL for storage key");
                None
            }
        }
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

    /// Downloads all bytes of an object from the bucket using the internal client.
    /// Use this for server-side operations (ZIP generation, binary caching).
    /// Returns `AppError::NotFound` if the object does not exist.
    pub async fn get_object_bytes(&self, key: &str) -> Result<Vec<u8>, AppError> {
        let output = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(AppError::internal)?;

        let bytes = output
            .body
            .collect()
            .await
            .map_err(AppError::internal)?
            .into_bytes()
            .to_vec();

        Ok(bytes)
    }

    /// Fetches the metadata of an S3 object without downloading its content.
    /// Returns `None` if the object does not exist (404).
    pub async fn head_object_metadata(
        &self,
        key: &str,
    ) -> Result<Option<HashMap<String, String>>, AppError> {
        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
        {
            Ok(output) => Ok(Some(output.metadata().cloned().unwrap_or_default())),
            Err(err) => {
                // HEAD on a missing object returns HTTP 404; treat it as a cache miss.
                if let aws_sdk_s3::error::SdkError::ServiceError(ref svc) = err {
                    if svc.raw().status().as_u16() == 404 {
                        return Ok(None);
                    }
                }
                Err(AppError::internal(err))
            }
        }
    }

    /// Uploads bytes with custom S3 user-defined metadata.
    /// Metadata keys must NOT include the `x-amz-meta-` prefix — the SDK adds it.
    pub async fn put_object_with_metadata(
        &self,
        key: &str,
        body: Vec<u8>,
        content_type: &str,
        metadata: HashMap<String, String>,
    ) -> Result<(), AppError> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(body))
            .content_type(content_type)
            .set_metadata(Some(metadata))
            .send()
            .await
            .map_err(AppError::internal)?;

        Ok(())
    }

    /// Builds the canonical S3 object key for a plugin binary.
    /// Pattern: `plugins/{slug}/{version}/{file_name}`
    pub fn build_storage_key(plugin_slug: &str, version: &str, file_name: &str) -> String {
        format!("plugins/{plugin_slug}/{version}/{file_name}")
    }
}
