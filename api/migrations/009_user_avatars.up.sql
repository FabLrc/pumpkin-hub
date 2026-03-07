-- Stores uploaded avatar binaries separately from the users row to keep
-- SELECT * queries lightweight. avatar_url on the users table is updated
-- to point at /api/v1/users/{id}/avatar after a successful upload.
CREATE TABLE IF NOT EXISTS user_avatars (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data         BYTEA       NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    size_bytes   INTEGER     NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
