DROP TABLE IF EXISTS api_key_usage_logs;
ALTER TABLE api_keys DROP COLUMN IF EXISTS rate_limit_per_second;
ALTER TABLE api_keys DROP COLUMN IF EXISTS rate_limit_burst_size;
