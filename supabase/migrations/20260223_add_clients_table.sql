-- ==========================================================
-- Migration: Add 'clients' table for 3-level hierarchy
-- Client > Project > Proof
-- ==========================================================

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for clients (same pattern as projects)
CREATE POLICY "Users can view clients in their org" ON clients
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clients in their org" ON clients
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clients in their org" ON clients
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clients in their org" ON clients
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- 4. Add client_id to projects (nullable first for migration)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- 5. Migrate existing projects → create a client for each, then link
DO $$
DECLARE
    proj RECORD;
    new_client_id UUID;
BEGIN
    FOR proj IN SELECT DISTINCT id, name, organization_id FROM projects WHERE client_id IS NULL
    LOOP
        INSERT INTO clients (name, organization_id)
        VALUES (proj.name, proj.organization_id)
        RETURNING id INTO new_client_id;

        UPDATE projects SET client_id = new_client_id WHERE id = proj.id;
    END LOOP;
END $$;

-- 6. Make client_id NOT NULL after migration
ALTER TABLE projects ALTER COLUMN client_id SET NOT NULL;
