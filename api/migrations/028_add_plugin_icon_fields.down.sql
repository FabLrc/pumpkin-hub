ALTER TABLE plugins
    DROP COLUMN IF EXISTS icon_storage_key,
    DROP COLUMN IF EXISTS icon_url;
