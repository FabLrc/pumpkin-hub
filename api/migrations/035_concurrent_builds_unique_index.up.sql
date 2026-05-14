CREATE UNIQUE INDEX IF NOT EXISTS idx_build_jobs_active_per_project
    ON build_jobs (project_id) WHERE status IN ('queued', 'running');
