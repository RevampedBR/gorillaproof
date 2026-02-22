-- Sprint 9: Comment enhancements
-- Add attachment support and internal/private visibility

ALTER TABLE comments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
