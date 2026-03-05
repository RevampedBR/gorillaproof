-- ============================================================
-- Access Control Groups System
-- Groups of internal members + assignment to proofs/projects
-- ============================================================

-- 1. Contact Groups: Named groups within an organization
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- 2. Contact Group Members: Internal org members assigned to groups
CREATE TABLE IF NOT EXISTS contact_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- 3. Proof Access Assignments: Who can access a restricted proof
CREATE TABLE IF NOT EXISTS proof_access_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT proof_access_target CHECK (
        (group_id IS NOT NULL AND user_id IS NULL) OR
        (group_id IS NULL AND user_id IS NOT NULL)
    ),
    UNIQUE NULLS NOT DISTINCT (proof_id, group_id, user_id)
);

-- 4. Project Access Assignments: Who can access a restricted project
CREATE TABLE IF NOT EXISTS project_access_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT project_access_target CHECK (
        (group_id IS NOT NULL AND user_id IS NULL) OR
        (group_id IS NULL AND user_id IS NOT NULL)
    ),
    UNIQUE NULLS NOT DISTINCT (project_id, group_id, user_id)
);

-- 5. Add access_mode to proofs and projects (opt-in restriction)
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS access_mode TEXT
    CHECK (access_mode IN ('org_wide', 'restricted'))
    DEFAULT 'org_wide';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS access_mode TEXT
    CHECK (access_mode IN ('org_wide', 'restricted'))
    DEFAULT 'org_wide';

-- ============================================================
-- RLS: Enable on new tables
-- ============================================================
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_access_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Check if user has access to a specific proof
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_proof_access(p_proof_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_access_mode TEXT;
    v_org_id UUID;
BEGIN
    -- Get proof's access mode and org
    SELECT p.access_mode, COALESCE(pr.organization_id, c.organization_id)
    INTO v_access_mode, v_org_id
    FROM proofs p
    LEFT JOIN projects pr ON pr.id = p.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = p_proof_id;

    -- If org_wide, just check org membership
    IF v_access_mode = 'org_wide' OR v_access_mode IS NULL THEN
        RETURN public.user_belongs_to_org(v_org_id);
    END IF;

    -- If restricted: admin/owner always has access
    IF EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_org_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check direct user assignment
    IF EXISTS (
        SELECT 1 FROM proof_access_assignments
        WHERE proof_id = p_proof_id
          AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check group assignment
    IF EXISTS (
        SELECT 1 FROM proof_access_assignments paa
        JOIN contact_group_members cgm ON cgm.group_id = paa.group_id
        WHERE paa.proof_id = p_proof_id
          AND cgm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: Check if user has access to a specific project
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_access_mode TEXT;
    v_org_id UUID;
BEGIN
    SELECT access_mode, organization_id
    INTO v_access_mode, v_org_id
    FROM projects
    WHERE id = p_project_id;

    IF v_access_mode = 'org_wide' OR v_access_mode IS NULL THEN
        RETURN public.user_belongs_to_org(v_org_id);
    END IF;

    -- Admin/owner always has access
    IF EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_org_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Direct user assignment
    IF EXISTS (
        SELECT 1 FROM project_access_assignments
        WHERE project_id = p_project_id
          AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Group assignment
    IF EXISTS (
        SELECT 1 FROM project_access_assignments paa
        JOIN contact_group_members cgm ON cgm.group_id = paa.group_id
        WHERE paa.project_id = p_project_id
          AND cgm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS Policies: contact_groups
-- ============================================================
CREATE POLICY "Org members can view groups"
    ON contact_groups FOR SELECT
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Admins can create groups"
    ON contact_groups FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = contact_groups.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update groups"
    ON contact_groups FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = contact_groups.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete groups"
    ON contact_groups FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = contact_groups.organization_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS Policies: contact_group_members
-- ============================================================
CREATE POLICY "Org members can view group members"
    ON contact_group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM contact_groups cg
            WHERE cg.id = contact_group_members.group_id
              AND public.user_belongs_to_org(cg.organization_id)
        )
    );

CREATE POLICY "Admins can manage group members"
    ON contact_group_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM contact_groups cg
            JOIN organization_members om ON om.organization_id = cg.organization_id
            WHERE cg.id = contact_group_members.group_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can remove group members"
    ON contact_group_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM contact_groups cg
            JOIN organization_members om ON om.organization_id = cg.organization_id
            WHERE cg.id = contact_group_members.group_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS Policies: proof_access_assignments
-- ============================================================
CREATE POLICY "Users can view proof assignments they have access to"
    ON proof_access_assignments FOR SELECT
    USING (public.user_has_proof_access(proof_id));

CREATE POLICY "Admins can manage proof assignments"
    ON proof_access_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM proofs p
            LEFT JOIN projects pr ON pr.id = p.project_id
            LEFT JOIN clients c ON c.id = p.client_id
            JOIN organization_members om
              ON om.organization_id = COALESCE(pr.organization_id, c.organization_id)
            WHERE p.id = proof_access_assignments.proof_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete proof assignments"
    ON proof_access_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM proofs p
            LEFT JOIN projects pr ON pr.id = p.project_id
            LEFT JOIN clients c ON c.id = p.client_id
            JOIN organization_members om
              ON om.organization_id = COALESCE(pr.organization_id, c.organization_id)
            WHERE p.id = proof_access_assignments.proof_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================================
-- RLS Policies: project_access_assignments
-- ============================================================
CREATE POLICY "Users can view project assignments they have access to"
    ON project_access_assignments FOR SELECT
    USING (public.user_has_project_access(project_id));

CREATE POLICY "Admins can manage project assignments"
    ON project_access_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects pr
            JOIN organization_members om ON om.organization_id = pr.organization_id
            WHERE pr.id = project_access_assignments.project_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete project assignments"
    ON project_access_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects pr
            JOIN organization_members om ON om.organization_id = pr.organization_id
            WHERE pr.id = project_access_assignments.project_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );
