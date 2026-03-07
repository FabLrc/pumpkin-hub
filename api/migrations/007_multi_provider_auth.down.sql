-- Reverse multi-provider auth migration.

-- Remove migrated provider records.
DROP TABLE IF EXISTS auth_providers;

-- Restore github_id NOT NULL constraint (will fail if any NULL values exist).
ALTER TABLE users ALTER COLUMN github_id SET NOT NULL;

-- Remove password_hash column.
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
