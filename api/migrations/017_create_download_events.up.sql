-- Track individual download events for time-series analytics.
-- One row per download occurrence, enabling weekly/monthly aggregation.
CREATE TABLE download_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plugin_id   UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version_id  UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    platform    TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for per-plugin time-series queries (author dashboard, plugin page)
CREATE INDEX idx_download_events_plugin_time ON download_events (plugin_id, downloaded_at DESC);

-- Index for global time-series queries (admin/author aggregate KPIs)
CREATE INDEX idx_download_events_time ON download_events (downloaded_at DESC);
