-- Add unique constraint on email for email/password authentication.
-- Allows NULL (OAuth-only accounts may not have email) but prevents duplicates.
CREATE UNIQUE INDEX idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL;
