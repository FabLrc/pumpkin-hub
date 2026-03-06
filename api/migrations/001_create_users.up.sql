-- Users table: stores author profiles synchronized from GitHub OAuth.
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id       BIGINT NOT NULL UNIQUE,
    username        VARCHAR(39) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    email           VARCHAR(255),
    avatar_url      TEXT,
    bio             TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'author'
                        CHECK (role IN ('admin', 'moderator', 'author')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_github_id ON users (github_id);
CREATE INDEX idx_users_username ON users (username);
