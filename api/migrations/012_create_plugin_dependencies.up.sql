-- Inter-plugin dependency declarations.
-- A specific version of a plugin can depend on another plugin
-- with a semver version requirement (e.g. ">=1.0.0, <2.0.0").

CREATE TABLE IF NOT EXISTS plugin_dependencies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id              UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    dependency_plugin_id    UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version_req             VARCHAR(100) NOT NULL,
    is_optional             BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A version can only declare a dependency on a given plugin once.
    UNIQUE (version_id, dependency_plugin_id)
);

-- Fast lookup: "which versions depend on plugin X?"
CREATE INDEX idx_plugin_dependencies_dependency_plugin_id
    ON plugin_dependencies (dependency_plugin_id);

-- Fast lookup: "what are version X's dependencies?"
CREATE INDEX idx_plugin_dependencies_version_id
    ON plugin_dependencies (version_id);
