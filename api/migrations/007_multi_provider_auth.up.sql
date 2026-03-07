-- Multi-provider authentication: restructure users table and add auth_providers.

-- 1. Add password_hash column for email/password accounts (nullable: OAuth-only users won't have one).
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- 2. Make github_id nullable (users created via email or other OAuth won't have one).
ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL;

-- 3. Create auth_providers table to track linked OAuth providers per user.
CREATE TABLE IF NOT EXISTS auth_providers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider    VARCHAR(20) NOT NULL CHECK (provider IN ('github', 'google', 'discord')),
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (provider, provider_id)
);

CREATE INDEX idx_auth_providers_user_id ON auth_providers (user_id);
CREATE INDEX idx_auth_providers_lookup ON auth_providers (provider, provider_id);

-- 4. Migrate existing github_id data into auth_providers.
INSERT INTO auth_providers (user_id, provider, provider_id)
SELECT id, 'github', github_id::TEXT
FROM users
WHERE github_id IS NOT NULL
ON CONFLICT DO NOTHING;
