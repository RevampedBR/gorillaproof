-- Migration to add Clients table and link to Projects

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client_id to projects
ALTER TABLE projects ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Enable RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients (similar to projects/orgs)
-- Users can view clients if they belong to the organization
CREATE POLICY "Users can view clients in their organization" ON clients
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Users can insert clients if they belong to the organization (admin/owner check could be added later)
CREATE POLICY "Users can insert clients in their organization" ON clients
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Users can update clients in their organization
CREATE POLICY "Users can update clients in their organization" ON clients
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Users can delete clients in their organization
CREATE POLICY "Users can delete clients in their organization" ON clients
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );
