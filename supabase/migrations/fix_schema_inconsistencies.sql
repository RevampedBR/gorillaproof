-- Fix schema inconsistencies found during audit

-- 1. Create missing 'clients' table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'archived', 'completed')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add client_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Add file_type to proofs (to store category: 'image', 'video', 'pdf', etc.)
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 4. Enable RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for clients
-- Members can view clients in their org
CREATE POLICY "Members can view clients in their org"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = clients.organization_id
        AND user_id = auth.uid()
    )
  );

-- Members can create clients in their org
CREATE POLICY "Members can create clients in their org"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = clients.organization_id
        AND user_id = auth.uid()
    )
  );

-- Members can update their org's clients
CREATE POLICY "Members can update their org's clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = clients.organization_id
        AND user_id = auth.uid()
    )
  );

-- Owners/admins can delete clients
CREATE POLICY "Owners/admins can delete clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = clients.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
