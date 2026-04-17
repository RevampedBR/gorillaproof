-- Fix 504 timeout: add missing FK indexes across all core tables
-- The dashboard was timing out due to sequential queries without proper indexes.
-- While data volume is small (~30 rows per table), every query goes through
-- Supabase's RLS engine which benefits from indexes even on small tables.

-- organization_members: PK is (organization_id, user_id) but all app queries filter by user_id alone
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members (user_id);

-- projects: frequently filtered by organization_id
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects (organization_id);

-- clients: frequently filtered by organization_id
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients (organization_id);

-- proofs: frequently filtered by client_id, project_id, and status
CREATE INDEX IF NOT EXISTS idx_proofs_client_id ON proofs (client_id);
CREATE INDEX IF NOT EXISTS idx_proofs_project_id ON proofs (project_id);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON proofs (status);

-- versions: frequently filtered by proof_id
CREATE INDEX IF NOT EXISTS idx_versions_proof_id ON versions (proof_id);

-- comments: frequently filtered by version_id and status
CREATE INDEX IF NOT EXISTS idx_comments_version_id ON comments (version_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments (status);
