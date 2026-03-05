-- Multi-page versions: allows a single version to contain multiple files (pages)
-- Used when user uploads 2+ files in "Combinar em uma única revisão" mode

CREATE TABLE version_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID REFERENCES versions(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(version_id, page_number)
);

ALTER TABLE version_pages ENABLE ROW LEVEL SECURITY;

-- RLS: inherit access via version → proof → org
CREATE POLICY "Members can view version pages"
  ON version_pages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      JOIN organization_members om ON om.organization_id = (
        COALESCE(
          (SELECT p.organization_id FROM projects p WHERE p.id = pr.project_id),
          (SELECT c.organization_id FROM clients c WHERE c.id = pr.client_id)
        )
      )
      WHERE v.id = version_pages.version_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert version pages"
  ON version_pages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM versions v
      JOIN proofs pr ON pr.id = v.proof_id
      JOIN organization_members om ON om.organization_id = (
        COALESCE(
          (SELECT p.organization_id FROM projects p WHERE p.id = pr.project_id),
          (SELECT c.organization_id FROM clients c WHERE c.id = pr.client_id)
        )
      )
      WHERE v.id = version_pages.version_id
        AND om.user_id = auth.uid()
    )
  );
