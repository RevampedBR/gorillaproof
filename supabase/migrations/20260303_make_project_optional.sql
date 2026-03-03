-- ==========================================================
-- Migration: Make project_id optional on proofs
-- Proofs can now live directly under a client (no project)
-- ==========================================================

-- 1. Add client_id column to proofs (nullable first for migration)
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- 2. Backfill client_id from the proof's project
UPDATE proofs
SET client_id = projects.client_id
FROM projects
WHERE proofs.project_id = projects.id
  AND proofs.client_id IS NULL;

-- 3. Make client_id NOT NULL after backfill
ALTER TABLE proofs ALTER COLUMN client_id SET NOT NULL;

-- 4. Make project_id nullable (allow proofs without a project)
ALTER TABLE proofs ALTER COLUMN project_id DROP NOT NULL;

-- 5. RLS policy for loose proofs (proofs accessed via client → org)
CREATE POLICY "Users can view loose proofs via client org" ON proofs
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE om.user_id = auth.uid()
        )
    );
