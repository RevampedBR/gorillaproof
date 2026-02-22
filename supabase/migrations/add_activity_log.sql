-- Activity Log table for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID REFERENCES proofs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'version_uploaded', 'comment_added', 'status_changed', 'comment_resolved', 'deadline_set', 'comments_carried'
    metadata JSONB DEFAULT '{}', -- flexible payload per action type
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: users in the same org can read activity logs
CREATE POLICY "org_members_can_read_activity"
    ON activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pj ON p.project_id = pj.id
            JOIN organization_members om ON om.organization_id = pj.organization_id
            WHERE p.id = activity_log.proof_id
            AND om.user_id = auth.uid()
        )
    );

-- RLS policy: authenticated users can insert activity logs
CREATE POLICY "authenticated_can_insert_activity"
    ON activity_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_proof_id ON activity_log(proof_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
