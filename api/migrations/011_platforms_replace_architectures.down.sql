-- Revert: restore the architecture column with original CPU-arch values.

ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_platform_check;
ALTER TABLE binaries DROP CONSTRAINT IF EXISTS binaries_version_id_platform_key;

ALTER TABLE binaries RENAME COLUMN platform TO architecture;

UPDATE binaries SET architecture = CASE
    WHEN architecture = 'windows' THEN 'x86_64'
    WHEN architecture = 'linux'   THEN 'aarch64'
    WHEN architecture = 'macos'   THEN 'x86_64'
    ELSE architecture
END;

ALTER TABLE binaries
    ADD CONSTRAINT binaries_architecture_check
        CHECK (architecture IN ('x86_64', 'aarch64'));

ALTER TABLE binaries
    ADD CONSTRAINT binaries_version_id_architecture_key
        UNIQUE (version_id, architecture);
