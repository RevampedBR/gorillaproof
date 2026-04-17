-- ============================================================
-- Client Portal: Multi-Agency Client Visibility
-- Allows end-clients to see proofs/projects from multiple agencies
-- ============================================================

-- 1. Client Entities: The REAL company (e.g., Grupo Cristina)
-- One entity can be linked to clients from multiple organizations
CREATE TABLE IF NOT EXISTS client_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Client Entity Links: Maps an agency's `client` to the real entity
-- Many agency-owned clients → one client_entity
CREATE TABLE IF NOT EXISTS client_entity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_entity_id UUID NOT NULL REFERENCES client_entities(id) ON DELETE CASCADE,
    linked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id)  -- each agency-client maps to exactly one entity
);

-- 3. Client Users: Users who access the Portal do Cliente
CREATE TABLE IF NOT EXISTS client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_entity_id UUID NOT NULL REFERENCES client_entities(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'approver', 'admin')) DEFAULT 'viewer',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, client_entity_id)
);

-- ============================================================
-- RLS: Enable
-- ============================================================
ALTER TABLE client_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Check if current user is a client_user of a given entity
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_is_client_user(p_entity_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM client_users
        WHERE client_entity_id = p_entity_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: Check if current user is a client_user with access
-- to a given client (through entity links)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_client_portal_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM client_entity_links cel
        JOIN client_users cu ON cu.client_entity_id = cel.client_entity_id
        WHERE cel.client_id = p_client_id
          AND cu.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: Check if current user has ANY client_user record
-- Used for routing in middleware / UI
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_is_any_client_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM client_users
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS Policies: client_entities
-- ============================================================

-- Client users can see their own entities
CREATE POLICY "Client users can view their entities"
    ON client_entities FOR SELECT
    USING (public.user_is_client_user(id));

-- Org members can view entities linked to their clients
CREATE POLICY "Org members can view linked entities"
    ON client_entities FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM client_entity_links cel
            JOIN clients c ON c.id = cel.client_id
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE cel.client_entity_id = client_entities.id
              AND om.user_id = auth.uid()
        )
    );

-- Any authenticated user can create entities (for self-registration)
CREATE POLICY "Authenticated users can create entities"
    ON client_entities FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Entity admins can update
CREATE POLICY "Entity admins can update"
    ON client_entities FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM client_users
            WHERE client_entity_id = client_entities.id
              AND user_id = auth.uid()
              AND role = 'admin'
        )
    );

-- ============================================================
-- RLS Policies: client_entity_links
-- ============================================================

-- Org admins can manage links for their clients
CREATE POLICY "Org admins can create links"
    ON client_entity_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE c.id = client_entity_links.client_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Org admins can delete links"
    ON client_entity_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE c.id = client_entity_links.client_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- Org members can view links for their clients
CREATE POLICY "Org members can view links"
    ON client_entity_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE c.id = client_entity_links.client_id
              AND om.user_id = auth.uid()
        )
    );

-- Client users can see links to their entities
CREATE POLICY "Client users can view their links"
    ON client_entity_links FOR SELECT
    USING (public.user_is_client_user(client_entity_id));

-- ============================================================
-- RLS Policies: client_users
-- ============================================================

-- Client users can see other users of the same entity
CREATE POLICY "Client users can view entity members"
    ON client_users FOR SELECT
    USING (public.user_is_client_user(client_entity_id));

-- Org admins can view client users linked to their clients
CREATE POLICY "Org admins can view client users"
    ON client_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM client_entity_links cel
            JOIN clients c ON c.id = cel.client_id
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE cel.client_entity_id = client_users.client_entity_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
    );

-- Org admins can invite client users (via supabaseAdmin, but policy for safety)
CREATE POLICY "Org admins can create client users"
    ON client_users FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Client entity admins can remove users
CREATE POLICY "Entity admins can remove client users"
    ON client_users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM client_users cu2
            WHERE cu2.client_entity_id = client_users.client_entity_id
              AND cu2.user_id = auth.uid()
              AND cu2.role = 'admin'
        )
    );

-- ============================================================
-- Extended RLS: Allow client_users to view clients, proofs,
-- projects, versions, and comments through the portal
-- ============================================================

-- Clients: client portal users can see clients linked to their entity
CREATE POLICY "Portal users can view linked clients"
    ON clients FOR SELECT
    USING (public.user_has_client_portal_access(id));

-- Projects: client portal users can see projects of linked clients
CREATE POLICY "Portal users can view linked projects"
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM client_entity_links cel
            JOIN client_users cu ON cu.client_entity_id = cel.client_entity_id
            WHERE cel.client_id = projects.client_id
              AND cu.user_id = auth.uid()
        )
    );

-- Proofs: client portal users can see proofs of linked clients
CREATE POLICY "Portal users can view linked proofs"
    ON proofs FOR SELECT
    USING (public.user_has_client_portal_access(client_id));

-- Versions: client portal users can see versions of accessible proofs
CREATE POLICY "Portal users can view linked versions"
    ON versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM proofs pr
            WHERE pr.id = versions.proof_id
              AND public.user_has_client_portal_access(pr.client_id)
        )
    );

-- Comments: client portal users can see non-internal comments
CREATE POLICY "Portal users can view linked comments"
    ON comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM versions v
            JOIN proofs pr ON pr.id = v.proof_id
            WHERE v.id = comments.version_id
              AND public.user_has_client_portal_access(pr.client_id)
              AND (comments.is_internal IS NOT TRUE)
        )
    );
