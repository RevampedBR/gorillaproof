-- Sprint 11: Tags/labels for proofs + share tokens for Sprint 13

-- Tags column on proofs (array of text)
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Share tokens for guest access (Sprint 13 prep)
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Reviewer assignments (Sprint 12 prep)
CREATE TABLE IF NOT EXISTS proof_reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'reviewer',
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(proof_id, user_id)
);

-- RLS for proof_reviewers
ALTER TABLE proof_reviewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reviewers for proofs in their org" ON proof_reviewers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage reviewers" ON proof_reviewers FOR ALL USING (auth.uid() IS NOT NULL);
