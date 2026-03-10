-- Reviews: plugin ratings and comments by authenticated users.
-- Each user can leave at most one review per plugin (UNIQUE constraint).

CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id   UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(150),
    body        TEXT,
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plugin_id, author_id)
);

CREATE INDEX idx_reviews_plugin_id ON reviews (plugin_id);
CREATE INDEX idx_reviews_author_id ON reviews (author_id);
CREATE INDEX idx_reviews_plugin_rating ON reviews (plugin_id, rating);
