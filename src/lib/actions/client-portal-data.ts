"use server";

import { createClient } from "@/utils/supabase/server";

// ── Check if current user is a client portal user ──
export async function isClientUser(): Promise<{ isClient: boolean; entities: { id: string; name: string }[] }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isClient: false, entities: [] };

    const { data } = await supabase
        .from("client_users")
        .select("client_entity_id, client_entities ( id, name )")
        .eq("user_id", user.id);

    if (!data || data.length === 0) return { isClient: false, entities: [] };

    const entities = data.map((cu: any) => ({
        id: cu.client_entities?.id || cu.client_entity_id,
        name: cu.client_entities?.name || "Entity",
    }));

    return { isClient: true, entities };
}

// ── Get all clients visible to the portal user ──
export async function getPortalClients() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    // Get all entity IDs this user belongs to
    const { data: cuRecords } = await supabase
        .from("client_users")
        .select("client_entity_id")
        .eq("user_id", user.id);

    if (!cuRecords || cuRecords.length === 0) return { data: [], error: null };

    const entityIds = cuRecords.map(r => r.client_entity_id);

    // Get all clients linked to these entities
    const { data: links } = await supabase
        .from("client_entity_links")
        .select("client_id, client_entity_id, clients ( id, name, description, logo_url, status, organization_id, organizations ( name, logo_url ) )")
        .in("client_entity_id", entityIds);

    if (!links) return { data: [], error: null };

    const clients = links.map((link: any) => ({
        id: link.clients?.id,
        name: link.clients?.name,
        description: link.clients?.description,
        logo_url: link.clients?.logo_url,
        status: link.clients?.status,
        agency_name: link.clients?.organizations?.name || "Agência",
        agency_logo: link.clients?.organizations?.logo_url || null,
        entity_id: link.client_entity_id,
    })).filter(c => c.id);

    return { data: clients, error: null };
}

// ── Get portal dashboard data (aggregated from all linked clients) ──
export async function getPortalDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    // Get linked client IDs
    const { data: cuRecords } = await supabase
        .from("client_users")
        .select("client_entity_id")
        .eq("user_id", user.id);

    if (!cuRecords || cuRecords.length === 0) {
        return {
            data: {
                totalProofs: 0,
                pendingReview: 0,
                approved: 0,
                recentProofs: [],
                clientCount: 0,
            },
            error: null,
        };
    }

    const entityIds = cuRecords.map(r => r.client_entity_id);

    // Get all linked client IDs
    const { data: links } = await supabase
        .from("client_entity_links")
        .select("client_id")
        .in("client_entity_id", entityIds);

    if (!links || links.length === 0) {
        return {
            data: {
                totalProofs: 0,
                pendingReview: 0,
                approved: 0,
                recentProofs: [],
                clientCount: 0,
            },
            error: null,
        };
    }

    const clientIds = links.map(l => l.client_id);

    // Fetch proofs from all linked clients
    const { data: proofs } = await supabase
        .from("proofs")
        .select("id, title, status, updated_at, deadline, client_id, clients ( name, logo_url )")
        .in("client_id", clientIds)
        .order("updated_at", { ascending: false });

    const allProofs = proofs || [];

    const totalProofs = allProofs.length;
    const pendingReview = allProofs.filter(p => p.status === "in_review" || p.status === "changes_requested").length;
    const approved = allProofs.filter(p => p.status === "approved").length;
    const recentProofs = allProofs.slice(0, 10).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        updated_at: p.updated_at,
        deadline: p.deadline,
        client_name: p.clients?.name || "—",
        client_logo: p.clients?.logo_url || null,
    }));

    return {
        data: {
            totalProofs,
            pendingReview,
            approved,
            recentProofs,
            clientCount: clientIds.length,
        },
        error: null,
    };
}

// ── Get all proofs for the portal, optionally filtered by client ──
export async function getPortalProofs(clientId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    // Get linked client IDs
    const { data: cuRecords } = await supabase
        .from("client_users")
        .select("client_entity_id")
        .eq("user_id", user.id);

    if (!cuRecords || cuRecords.length === 0) return { data: [], error: null };

    const entityIds = cuRecords.map(r => r.client_entity_id);

    const { data: links } = await supabase
        .from("client_entity_links")
        .select("client_id")
        .in("client_entity_id", entityIds);

    if (!links || links.length === 0) return { data: [], error: null };

    const clientIds = links.map(l => l.client_id);

    // If filtering by client, ensure it's in the allowed list
    if (clientId && !clientIds.includes(clientId)) {
        return { data: [], error: "Acesso negado a este cliente" };
    }

    let query = supabase
        .from("proofs")
        .select(`
            id, title, status, updated_at, deadline, client_id, project_id, tags,
            clients ( id, name, logo_url ),
            projects ( id, name )
        `)
        .order("updated_at", { ascending: false });

    if (clientId) {
        query = query.eq("client_id", clientId);
    } else {
        query = query.in("client_id", clientIds);
    }

    const { data, error } = await query;

    return {
        data: (data || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            updated_at: p.updated_at,
            deadline: p.deadline,
            tags: p.tags,
            client_id: p.client_id,
            client_name: p.clients?.name || "—",
            client_logo: p.clients?.logo_url || null,
            project_id: p.project_id,
            project_name: p.projects?.name || null,
        })),
        error: error?.message ?? null,
    };
}

// ── Get sidebar data for portal user ──
export async function getPortalSidebarData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    // Get user's entities
    const { data: cuRecords } = await supabase
        .from("client_users")
        .select("client_entity_id, role, client_entities ( id, name, logo_url )")
        .eq("user_id", user.id);

    if (!cuRecords || cuRecords.length === 0) return { data: null, error: "Sem acesso ao portal" };

    // Get linked clients (brands) grouped by entity
    const entityIds = cuRecords.map((r: any) => r.client_entity_id);

    const { data: links } = await supabase
        .from("client_entity_links")
        .select("client_id, client_entity_id, clients ( id, name, logo_url, organizations ( name ) )")
        .in("client_entity_id", entityIds);

    // Group by entity
    const entities = cuRecords.map((cu: any) => {
        const entity = cu.client_entities;
        const entityLinks = (links || []).filter((l: any) => l.client_entity_id === cu.client_entity_id);
        return {
            id: entity?.id || cu.client_entity_id,
            name: entity?.name || "Portal",
            logo_url: entity?.logo_url || null,
            role: cu.role,
            brands: entityLinks.map((l: any) => ({
                id: l.clients?.id,
                name: l.clients?.name || "—",
                logo_url: l.clients?.logo_url || null,
                agency: l.clients?.organizations?.name || "—",
            })).filter((b: any) => b.id),
        };
    });

    return {
        data: {
            userName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
            userEmail: user.email || "",
            userInitial: (user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase(),
            entities,
        },
        error: null,
    };
}
