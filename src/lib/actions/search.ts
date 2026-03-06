"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export interface SearchResult {
    type: "proof" | "project" | "member";
    id: string;
    title: string;
    subtitle: string;
    href: string;
    status?: string;
}

export async function globalSearch(query: string): Promise<{ results: SearchResult[]; error: string | null }> {
    if (!query || query.trim().length < 2) return { results: [], error: null };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { results: [], error: "Não autenticado" };

    // Get user's org
    const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

    if (!membership) return { results: [], error: null };

    const orgId = membership.organization_id;
    const q = `%${query.trim()}%`;
    const results: SearchResult[] = [];

    // Search proofs — 2-step: get org project IDs, then search proofs
    const { data: orgProjects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("organization_id", orgId);

    const projectIds = (orgProjects ?? []).map((p: any) => p.id);

    if (projectIds.length > 0) {
        const { data: proofs } = await supabaseAdmin
            .from("proofs")
            .select("id, title, status, project_id, projects ( name, clients ( name ) )")
            .in("project_id", projectIds)
            .ilike("title", q)
            .order("updated_at", { ascending: false })
            .limit(5);

        for (const p of proofs ?? []) {
            const proj = (p as any).projects;
            results.push({
                type: "proof",
                id: p.id,
                title: p.title || "Sem título",
                subtitle: [proj?.clients?.name, proj?.name].filter(Boolean).join(" / ") || "—",
                href: `/proofs/${p.id}`,
                status: p.status,
            });
        }
    }

    // Search projects (in the user's org)
    const { data: projects } = await supabaseAdmin
        .from("projects")
        .select("id, name, organization_id, clients ( id, name )")
        .eq("organization_id", orgId)
        .ilike("name", q)
        .order("updated_at", { ascending: false })
        .limit(5);

    for (const p of projects ?? []) {
        const client = (p as any).clients;
        results.push({
            type: "project",
            id: p.id,
            title: p.name,
            subtitle: client?.name || "—",
            href: client?.id ? `/clients/${client.id}/projects/${p.id}` : `/`,
        });
    }

    // Search members (in the user's org)
    const { data: members } = await supabaseAdmin
        .from("organization_members")
        .select("user_id, role, users ( id, full_name, email )")
        .eq("organization_id", orgId)
        .limit(50);

    const filtered = (members ?? []).filter((m: any) => {
        const u = m.users;
        if (!u) return false;
        const name = (u.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const search = query.trim().toLowerCase();
        return name.includes(search) || email.includes(search);
    }).slice(0, 5);

    for (const m of filtered) {
        const u = (m as any).users;
        results.push({
            type: "member",
            id: u.id,
            title: u.full_name || u.email,
            subtitle: m.role === "admin" ? "Administrador" : "Membro",
            href: `/members`,
        });
    }

    return { results, error: null };
}
