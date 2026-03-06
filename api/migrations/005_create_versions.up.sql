-- Versions table: plugin releases with semver and compatibility info.
CREATE TABLE IF NOT EXISTS versions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id               UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version                 VARCHAR(50) NOT NULL,
    changelog               TEXT,
    pumpkin_version_min     VARCHAR(50),
    pumpkin_version_max     VARCHAR(50),
    downloads               BIGINT NOT NULL DEFAULT 0,
    is_yanked               BOOLEAN NOT NULL DEFAULT false,
    published_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (plugin_id, version)
);

CREATE INDEX idx_versions_plugin_id ON versions (plugin_id);
CREATE INDEX idx_versions_published_at ON versions (published_at DESC);
