CREATE TABLE node_registry_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_hash VARCHAR(64) NOT NULL UNIQUE,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_url TEXT NOT NULL,
    source_commit VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_hash VARCHAR(64) NOT NULL REFERENCES node_registry_snapshots(snapshot_hash) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('event', 'action', 'logic', 'data', 'math', 'flow')),
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (snapshot_hash, node_id)
);

CREATE INDEX idx_node_registry_snapshot ON node_registry (snapshot_hash);
CREATE INDEX idx_node_registry_category ON node_registry (category);

CREATE TABLE plugin_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    pumpkin_version_min VARCHAR(50),
    pumpkin_version_max VARCHAR(50),
    wit_snapshot_hash VARCHAR(64) REFERENCES node_registry_snapshots(snapshot_hash) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'building', 'published')),
    latest_build_id UUID,
    build_count INTEGER NOT NULL DEFAULT 0,
    published_plugin_id UUID REFERENCES plugins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plugin_projects_user_id ON plugin_projects (user_id);
CREATE INDEX idx_plugin_projects_slug ON plugin_projects (slug);
CREATE INDEX idx_plugin_projects_status ON plugin_projects (status);

CREATE TABLE build_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES plugin_projects(id) ON DELETE CASCADE,
    build_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    logs TEXT,
    artifact_storage_key VARCHAR(500),
    artifact_checksum_sha256 VARCHAR(64),
    artifact_file_size BIGINT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_build_jobs_project_id ON build_jobs (project_id);
CREATE INDEX idx_build_jobs_status ON build_jobs (status);
CREATE INDEX idx_build_jobs_queued ON build_jobs (created_at) WHERE status = 'queued';

-- Prevent concurrent active builds for the same project
CREATE UNIQUE INDEX idx_build_jobs_active_per_project
    ON build_jobs (project_id) WHERE status IN ('queued', 'running');
