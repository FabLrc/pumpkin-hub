-- Reports for abusive review content.
-- Users can flag reviews; staff can resolve them.

CREATE TABLE review_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL CHECK (reason IN (
        'spam', 'harassment', 'hate_speech', 'misinformation', 'other'
    )),
    details     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'dismissed', 'action_taken'
    )),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (review_id, reporter_id)
);

CREATE INDEX idx_review_reports_review_id ON review_reports (review_id);
CREATE INDEX idx_review_reports_status ON review_reports (status);
