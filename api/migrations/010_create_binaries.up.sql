-- Binary artifacts attached to a plugin version.
-- One binary per (version, architecture) combination.
CREATE TABLE IF NOT EXISTS binaries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id          UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    architecture        VARCHAR(20) NOT NULL CHECK (architecture IN ('x86_64', 'aarch64')),
    file_name           VARCHAR(255) NOT NULL,
    file_size           BIGINT NOT NULL CHECK (file_size > 0),
    checksum_sha256     VARCHAR(64) NOT NULL,
    storage_key         VARCHAR(500) NOT NULL,
    content_type        VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (version_id, architecture)
);

CREATE INDEX idx_binaries_version_id ON binaries (version_id);
