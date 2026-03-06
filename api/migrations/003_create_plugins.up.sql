-- Plugins table: central registry entries with metadata.
CREATE TABLE IF NOT EXISTS plugins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,
    short_description   VARCHAR(255),
    description         TEXT,
    repository_url      TEXT,
    documentation_url   TEXT,
    license             VARCHAR(50),
    downloads_total     BIGINT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plugins_slug ON plugins (slug);
CREATE INDEX idx_plugins_author_id ON plugins (author_id);
CREATE INDEX idx_plugins_is_active ON plugins (is_active) WHERE is_active = true;
CREATE INDEX idx_plugins_created_at ON plugins (created_at DESC);
