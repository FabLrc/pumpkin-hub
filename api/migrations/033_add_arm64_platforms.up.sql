ALTER TABLE server_configs
    DROP CONSTRAINT IF EXISTS server_configs_platform_check;
ALTER TABLE server_configs
    ADD CONSTRAINT server_configs_platform_check
    CHECK (platform IN ('windows', 'linux', 'macos', 'windows-arm64', 'linux-arm64', 'macos-arm64'));
