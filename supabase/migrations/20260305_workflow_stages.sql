-- ============================================================
-- Multi-Stage Workflows for Proofs
-- Enables sequential review stages (Design → Copy → Legal → Client)
-- ============================================================

-- 1. Workflow Templates: Reusable org-level workflow definitions
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    stages JSONB NOT NULL DEFAULT '[]',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- 2. Proof Workflows: Active workflow instance on a proof
CREATE TABLE IF NOT EXISTS proof_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE UNIQUE,
    template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
    current_stage_index INTEGER NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Workflow Stages: Individual stages within a proof's workflow
CREATE TABLE IF NOT EXISTS workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES proof_workflows(id) ON DELETE CASCADE,
    stage_index INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    approval_threshold INTEGER DEFAULT 0, -- 0 = all must approve
    status TEXT CHECK (status IN ('pending', 'active', 'approved', 'rejected', 'skipped')) DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(workflow_id, stage_index)
);

-- 4. Stage Reviewers: Who reviews in each stage (users or groups)
CREATE TABLE IF NOT EXISTS stage_reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT stage_reviewer_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    ),
    UNIQUE NULLS NOT DISTINCT (stage_id, user_id, group_id)
);

-- 5. Stage Decisions: Per-user decision within a specific stage
CREATE TABLE IF NOT EXISTS stage_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN (
        'approved', 'approved_with_changes', 'changes_requested', 'rejected'
    )),
    comment TEXT,
    decided_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stage_id, user_id)
);

-- ============================================================
-- Enable RLS on all workflow tables
-- ============================================================
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get org_id from a proof (used by RLS policies)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_proof_org_id(p_proof_id UUID)
RETURNS UUID AS $$
    SELECT COALESCE(pr.organization_id, c.organization_id)
    FROM proofs p
    LEFT JOIN projects pr ON pr.id = p.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = p_proof_id
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: workflow_templates (org-scoped)
-- ============================================================
CREATE POLICY "Org members can view workflow templates"
    ON workflow_templates FOR SELECT
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Admins can create workflow templates"
    ON workflow_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = workflow_templates.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update workflow templates"
    ON workflow_templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = workflow_templates.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete workflow templates"
    ON workflow_templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = workflow_templates.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS: proof_workflows (via proof → org)
-- ============================================================
CREATE POLICY "Org members can view proof workflows"
    ON proof_workflows FOR SELECT
    USING (
        public.user_belongs_to_org(public.get_proof_org_id(proof_id))
    );

CREATE POLICY "Admins can manage proof workflows"
    ON proof_workflows FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = public.get_proof_org_id(proof_workflows.proof_id)
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS: workflow_stages (via workflow → proof → org)
-- ============================================================
CREATE POLICY "Org members can view workflow stages"
    ON workflow_stages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM proof_workflows pw
            WHERE pw.id = workflow_stages.workflow_id
              AND public.user_belongs_to_org(public.get_proof_org_id(pw.proof_id))
        )
    );

CREATE POLICY "Admins can manage workflow stages"
    ON workflow_stages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM proof_workflows pw
            JOIN organization_members om
              ON om.organization_id = public.get_proof_org_id(pw.proof_id)
            WHERE pw.id = workflow_stages.workflow_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS: stage_reviewers
-- ============================================================
CREATE POLICY "Org members can view stage reviewers"
    ON stage_reviewers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_stages ws
            JOIN proof_workflows pw ON pw.id = ws.workflow_id
            WHERE ws.id = stage_reviewers.stage_id
              AND public.user_belongs_to_org(public.get_proof_org_id(pw.proof_id))
        )
    );

CREATE POLICY "Admins can manage stage reviewers"
    ON stage_reviewers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_stages ws
            JOIN proof_workflows pw ON pw.id = ws.workflow_id
            JOIN organization_members om
              ON om.organization_id = public.get_proof_org_id(pw.proof_id)
            WHERE ws.id = stage_reviewers.stage_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS: stage_decisions
-- ============================================================
CREATE POLICY "Org members can view stage decisions"
    ON stage_decisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_stages ws
            JOIN proof_workflows pw ON pw.id = ws.workflow_id
            WHERE ws.id = stage_decisions.stage_id
              AND public.user_belongs_to_org(public.get_proof_org_id(pw.proof_id))
        )
    );

CREATE POLICY "Users can submit own stage decisions"
    ON stage_decisions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stage decisions"
    ON stage_decisions FOR UPDATE
    USING (user_id = auth.uid());
