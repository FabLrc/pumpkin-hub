-- Replace CPU architectures (x86_64, aarch64) with OS platforms (windows, macos, linux).
-- Plugin authors publish one binary per target OS, not per CPU architecture.

-- Drop existing constraints tied to the old column name + values.
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_architecture_check;
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_version_id_architecture_key;

-- Rename the column.
ALTER TABLE binaries RENAME COLUMN architecture TO platform;

-- Migrate existing data (best-effort mapping for dev seeds / early uploads).
UPDATE binaries SET platform = CASE
    WHEN platform = 'x86_64'  THEN 'windows'
    WHEN platform = 'aarch64' THEN 'linux'
    ELSE platform
END;

-- Apply the new value set and uniqueness constraint.
ALTER TABLE binaries
    ADD CONSTRAINT binaries_platform_check
        CHECK (platform IN ('windows', 'macos', 'linux'));

ALTER TABLE binaries
    ADD CONSTRAINT binaries_version_id_platform_key
        UNIQUE (version_id, platform);
