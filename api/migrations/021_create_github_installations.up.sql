-- GitHub App installations: links a GitHub repository to a plugin for automated publishing.
CREATE TABLE github_installations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id           UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    installation_id     BIGINT NOT NULL,
    repository_owner    TEXT NOT NULL,
    repository_name     TEXT NOT NULL,
    default_branch      TEXT NOT NULL DEFAULT 'main',
    sync_readme         BOOLEAN NOT NULL DEFAULT true,
    sync_changelog      BOOLEAN NOT NULL DEFAULT true,
    auto_publish        BOOLEAN NOT NULL DEFAULT true,
    last_webhook_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each plugin can only be linked to one repository
    CONSTRAINT uq_github_installations_plugin UNIQUE (plugin_id),
    -- Each repository can only be linked to one plugin
    CONSTRAINT uq_github_installations_repo UNIQUE (repository_owner, repository_name)
);

CREATE INDEX idx_github_installations_user ON github_installations(user_id);
CREATE INDEX idx_github_installations_repo ON github_installations(repository_owner, repository_name);
CREATE INDEX idx_github_installations_installation ON github_installations(installation_id);
