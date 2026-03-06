"use server";

import { createClient } from "@/utils/supabase/server";

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

    const q = `%${query.trim()}%`;
    const results: SearchResult[] = [];

    // Search proofs
    const { data: proofs } = await supabase
        .from("proofs")
        .select("id, title, status, projects ( title, clients ( name ) )")
        .ilike("title", q)
        .order("updated_at", { ascending: false })
        .limit(5);

    for (const p of proofs ?? []) {
        const proj = (p as any).projects;
        results.push({
            type: "proof",
            id: p.id,
            title: p.title || "Sem título",
            subtitle: [proj?.clients?.name, proj?.title].filter(Boolean).join(" / ") || "—",
            href: `/proofs/${p.id}`,
            status: p.status,
        });
    }

    // Search projects
    const { data: projects } = await supabase
        .from("projects")
        .select("id, title, clients ( id, name )")
        .ilike("title", q)
        .order("updated_at", { ascending: false })
        .limit(5);

    for (const p of projects ?? []) {
        const client = (p as any).clients;
        results.push({
            type: "project",
            id: p.id,
            title: p.title,
            subtitle: client?.name || "—",
            href: client?.id ? `/clients/${client.id}/projects/${p.id}` : `/`,
        });
    }

    // Search members
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

    if (membership) {
        const { data: members } = await supabase
            .from("organization_members")
            .select("user_id, role, users ( id, full_name, email )")
            .eq("organization_id", membership.organization_id)
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
    }

    return { results, error: null };
}
