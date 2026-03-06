-- ╔══════════════════════════════════════════════╗
-- ║ Proof Checklist Items                        ║
-- ╚══════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS proof_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    checked BOOLEAN DEFAULT false,
    checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    checked_at TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE proof_checklist_items ENABLE ROW LEVEL SECURITY;

-- Helper: check org membership via proof
CREATE POLICY "Org members can view checklist items"
    ON proof_checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pj ON p.project_id = pj.id
            JOIN organization_members om ON om.organization_id = pj.organization_id
            WHERE p.id = proof_checklist_items.proof_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Org members can insert checklist items"
    ON proof_checklist_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pj ON p.project_id = pj.id
            JOIN organization_members om ON om.organization_id = pj.organization_id
            WHERE p.id = proof_checklist_items.proof_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Org members can update checklist items"
    ON proof_checklist_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pj ON p.project_id = pj.id
            JOIN organization_members om ON om.organization_id = pj.organization_id
            WHERE p.id = proof_checklist_items.proof_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Org members can delete checklist items"
    ON proof_checklist_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM proofs p
            JOIN projects pj ON p.project_id = pj.id
            JOIN organization_members om ON om.organization_id = pj.organization_id
            WHERE p.id = proof_checklist_items.proof_id
            AND om.user_id = auth.uid()
        )
    );

-- Private replies: add visibility columns to comments
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS visible_to UUID[] DEFAULT '{}';
