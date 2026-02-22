-- Per-reviewer decision tracking
-- Each reviewer can independently record their decision on a proof version

CREATE TABLE IF NOT EXISTS proof_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'approved_with_changes', 'changes_requested', 'not_relevant', 'rejected')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(proof_id, user_id)  -- one decision per reviewer per proof
);

-- Add locked_at column to proofs for proof locking
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- RLS
ALTER TABLE proof_decisions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view decisions for proofs in their org
CREATE POLICY "Users can view decisions in their org" ON proof_decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pr ON pr.id = p.project_id
            JOIN organization_members om ON om.organization_id = pr.organization_id
            WHERE p.id = proof_decisions.proof_id
            AND om.user_id = auth.uid()
        )
    );

-- Users can insert/update their own decisions
CREATE POLICY "Users can manage own decisions" ON proof_decisions
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
