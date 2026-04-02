CREATE TABLE server_configs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    platform    VARCHAR(20) NOT NULL CHECK (platform IN ('windows', 'linux', 'macos')),
    share_token UUID        NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_server_configs_share_token ON server_configs (share_token);
CREATE INDEX idx_server_configs_user_id ON server_configs (user_id);

CREATE TABLE server_config_plugins (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id   UUID        NOT NULL REFERENCES server_configs(id) ON DELETE CASCADE,
    plugin_id   UUID        NOT NULL REFERENCES plugins(id) ON DELETE RESTRICT,
    version_id  UUID        NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
    is_auto_dep BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (config_id, plugin_id)
);

CREATE INDEX idx_server_config_plugins_config_id ON server_config_plugins (config_id);
