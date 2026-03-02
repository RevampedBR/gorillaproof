-- Guest Reviewers: External users who review proofs via tokenized links
-- No auth.users account required

-- 1. Guest reviewers table
CREATE TABLE IF NOT EXISTS guest_reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT,
    token TEXT NOT NULL,  -- matches the proof's share_token for validation
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guest_reviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register as guest reviewer"
    ON guest_reviewers FOR INSERT WITH CHECK (true);

CREATE POLICY "Guest reviewers are publicly readable"
    ON guest_reviewers FOR SELECT USING (true);

-- 2. Share token expiration on proofs
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;

-- 3. Allow guest comments (nullable guest_reviewer_id)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_reviewer_id UUID REFERENCES guest_reviewers(id) ON DELETE SET NULL;

-- Make user_id nullable for guest comments
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;

-- 4. Allow guest decisions
ALTER TABLE proof_decisions ADD COLUMN IF NOT EXISTS guest_reviewer_id UUID REFERENCES guest_reviewers(id) ON DELETE SET NULL;

-- RLS: allow guests to insert comments via public API
CREATE POLICY "Guests can insert comments" ON comments
    FOR INSERT WITH CHECK (guest_reviewer_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- RLS: allow guests to insert decisions via public API
CREATE POLICY "Guests can insert decisions" ON proof_decisions
    FOR INSERT WITH CHECK (guest_reviewer_id IS NOT NULL OR auth.uid() IS NOT NULL);
