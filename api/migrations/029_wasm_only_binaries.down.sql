-- Rollback migration 029: Restore platform column and constraints

-- 1. Drop the single-binary constraint
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_version_id_key;

-- 2. Re-add platform column (defaulting existing rows to 'wasm')
ALTER TABLE binaries ADD COLUMN platform VARCHAR(20) NOT NULL DEFAULT 'wasm';

-- 3. Restore unique constraint on (version_id, platform)
ALTER TABLE binaries ADD CONSTRAINT binaries_version_id_platform_key UNIQUE (version_id, platform);
