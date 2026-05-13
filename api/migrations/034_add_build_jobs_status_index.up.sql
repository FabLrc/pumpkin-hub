-- Index for efficient queries filtering by (project_id, status)
-- Used by cleanup_old_builds and active build checks
CREATE INDEX IF NOT EXISTS idx_build_jobs_project_status
    ON build_jobs (project_id, status);
