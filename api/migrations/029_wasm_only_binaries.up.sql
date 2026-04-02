-- Migration 029: Switch to single .wasm binary per version (cross-platform)
-- Remove platform-specific constraints and column from binaries table

-- 1. Remove duplicate binaries before adding UNIQUE (version_id) constraint
--    Keep the earliest-uploaded binary for each version
DELETE FROM binaries
WHERE id NOT IN (
    SELECT DISTINCT ON (version_id) id
    FROM binaries
    ORDER BY version_id, uploaded_at
);

-- 2. Drop platform-related constraints
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_platform_check;
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_version_id_platform_key;

-- 3. Drop platform column
ALTER TABLE binaries DROP COLUMN IF EXISTS platform;

-- 4. Add new constraint: exactly one binary per version
ALTER TABLE binaries ADD CONSTRAINT binaries_version_id_key UNIQUE (version_id);
