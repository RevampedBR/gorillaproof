-- Fix comments RLS policies to support proofs without projects (null project_id)
-- The old policies JOIN through projects, which fails for "loose proofs"

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view comments" ON comments;
DROP POLICY IF EXISTS "Members can create comments" ON comments;

-- Recreated: view comments (supports proofs with OR without projects)
CREATE POLICY "Members can view comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      LEFT JOIN projects p ON p.id = pr.project_id
      WHERE v.id = comments.version_id
        AND (
          (p.id IS NOT NULL AND user_belongs_to_org(p.organization_id))
          OR
          (pr.project_id IS NULL AND pr.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = pr.client_id AND user_belongs_to_org(c.organization_id)
          ))
        )
    )
  );

-- Recreated: insert comments (supports proofs with OR without projects)
CREATE POLICY "Members can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      LEFT JOIN projects p ON p.id = pr.project_id
      WHERE v.id = comments.version_id
        AND (
          (p.id IS NOT NULL AND user_belongs_to_org(p.organization_id))
          OR
          (pr.project_id IS NULL AND pr.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = pr.client_id AND user_belongs_to_org(c.organization_id)
          ))
        )
    )
    AND user_id = auth.uid()
  );
