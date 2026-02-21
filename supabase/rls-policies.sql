-- GorillaProof RLS Policies
-- Run this in Supabase SQL Editor after schema.sql

-- ============================================================
-- HELPER: Check if a user belongs to a specific organization
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (user_belongs_to_org(id));

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE POLICY "Users can view members of their organizations"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = id
        AND om2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 3. ORGANIZATION MEMBERS
-- ============================================================
CREATE POLICY "Members can view their org's members"
  ON organization_members FOR SELECT
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "Owners/admins can manage members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_members.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can remove members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 4. PROJECTS
-- ============================================================
CREATE POLICY "Members can view their org's projects"
  ON projects FOR SELECT
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "Members can create projects in their org"
  ON projects FOR INSERT
  WITH CHECK (user_belongs_to_org(organization_id));

CREATE POLICY "Members can update their org's projects"
  ON projects FOR UPDATE
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "Owners/admins can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = projects.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 5. PROOFS
-- ============================================================
CREATE POLICY "Members can view proofs in their projects"
  ON proofs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = proofs.project_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

CREATE POLICY "Members can create proofs"
  ON proofs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = proofs.project_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

CREATE POLICY "Members can update proofs"
  ON proofs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = proofs.project_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

CREATE POLICY "Members can delete proofs"
  ON proofs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = proofs.project_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

-- ============================================================
-- 6. VERSIONS
-- ============================================================
CREATE POLICY "Members can view versions"
  ON versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proofs pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = versions.proof_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

CREATE POLICY "Members can upload versions"
  ON versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proofs pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = versions.proof_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

-- ============================================================
-- 7. COMMENTS
-- ============================================================
CREATE POLICY "Members can view comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      JOIN projects p ON p.id = pr.project_id
      WHERE v.id = comments.version_id
        AND user_belongs_to_org(p.organization_id)
    )
  );

CREATE POLICY "Members can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      JOIN projects p ON p.id = pr.project_id
      WHERE v.id = comments.version_id
        AND user_belongs_to_org(p.organization_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());
