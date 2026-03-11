-- Plugin media gallery: images and videos attached to a plugin.
CREATE TABLE plugin_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    -- Uploader (must be plugin owner or admin)
    uploaded_by UUID NOT NULL REFERENCES users(id),
    -- "image" or "video"
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    -- Original file name
    file_name VARCHAR(255) NOT NULL,
    -- Size in bytes
    file_size BIGINT NOT NULL,
    -- MIME type (image/jpeg, image/png, image/webp, video/mp4, video/webm)
    content_type VARCHAR(100) NOT NULL,
    -- S3 storage key for the full-resolution file
    storage_key VARCHAR(500) NOT NULL,
    -- S3 storage key for the thumbnail (generated for images; first-frame for videos)
    thumbnail_key VARCHAR(500),
    -- Optional caption / alt text
    caption TEXT,
    -- Display order (lower = first)
    sort_order INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by plugin
CREATE INDEX idx_plugin_media_plugin_id ON plugin_media(plugin_id);

-- Ordering within a plugin's gallery
CREATE INDEX idx_plugin_media_sort ON plugin_media(plugin_id, sort_order);
