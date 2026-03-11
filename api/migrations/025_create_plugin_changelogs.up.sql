-- Plugin changelogs: either synced from GitHub or manually edited.
CREATE TABLE plugin_changelogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    -- Full markdown content of the changelog
    content TEXT NOT NULL,
    -- "github" when auto-synced, "manual" when edited from the web UI
    source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('github', 'manual')),
    -- Last user who edited (NULL for automated GitHub syncs)
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One changelog per plugin
    CONSTRAINT unique_plugin_changelog UNIQUE (plugin_id)
);

CREATE INDEX idx_plugin_changelogs_plugin_id ON plugin_changelogs(plugin_id);
