-- Track when a proof was last viewed by a client/guest reviewer
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
