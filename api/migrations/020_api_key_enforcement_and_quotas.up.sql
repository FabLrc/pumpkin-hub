-- Per-key rate limiting columns
ALTER TABLE api_keys
    ADD COLUMN rate_limit_per_second INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN rate_limit_burst_size INTEGER NOT NULL DEFAULT 30;

-- API key usage audit log
CREATE TABLE api_key_usage_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id  UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    action      VARCHAR(100) NOT NULL,
    resource    TEXT NOT NULL,
    success     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_logs_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);
CREATE INDEX idx_api_key_usage_logs_key_created ON api_key_usage_logs(api_key_id, created_at DESC);
