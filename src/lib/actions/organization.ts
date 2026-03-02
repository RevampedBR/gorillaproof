"use server";

import { createClient } from "@/utils/supabase/server";

export async function getOrgSettings(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("organizations")
            .select("id, name, logo_url, brand_color, custom_domain, created_at, language, timezone, reviewer_auth_mode, default_proof_status, viewer_theme, auto_lock_on_decision, allow_download")
            .eq("id", orgId)
            .single();

        if (error) return { data: null, error: error.message };
        return { data, error: null };
    } catch {
        return { data: null, error: "Falha ao buscar configurações" };
    }
}

export async function updateOrgSettings(orgId: string, updates: {
    name?: string;
    logo_url?: string;
    brand_color?: string;
    custom_domain?: string;
    language?: string;
    timezone?: string;
    reviewer_auth_mode?: string;
    default_proof_status?: string;
    viewer_theme?: string;
    auto_lock_on_decision?: boolean;
    allow_download?: boolean;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        // Verify user is admin of this org
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .single();

        if (!membership || membership.role !== "admin") return { error: "Apenas administradores podem atualizar configurações" };

        const { error } = await supabase
            .from("organizations")
            .update(updates)
            .eq("id", orgId);

        if (error) return { error: error.message };
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar configurações" };
    }
}

export async function getOrgUsageStats(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    try {
        const { count: projectCount } = await supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId);

        const { data: projects } = await supabase
            .from("projects")
            .select("id")
            .eq("organization_id", orgId);

        const projectIds = projects?.map(p => p.id) || [];

        let proofCount = 0;
        let versionCount = 0;
        if (projectIds.length > 0) {
            const { count: pc } = await supabase
                .from("proofs")
                .select("id", { count: "exact", head: true })
                .in("project_id", projectIds);
            proofCount = pc || 0;

            const { data: proofs } = await supabase
                .from("proofs")
                .select("id")
                .in("project_id", projectIds);
            const proofIds = proofs?.map(p => p.id) || [];

            if (proofIds.length > 0) {
                const { count: vc } = await supabase
                    .from("versions")
                    .select("id", { count: "exact", head: true })
                    .in("proof_id", proofIds);
                versionCount = vc || 0;
            }
        }

        const { count: memberCount } = await supabase
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId);

        return {
            data: {
                projects: projectCount || 0,
                proofs: proofCount,
                versions: versionCount,
                members: memberCount || 0,
            },
            error: null,
        };
    } catch {
        return { data: null, error: "Falha ao buscar estatísticas" };
    }
}

// ── Dados para a sidebar (user + org) ──
export async function getSidebarData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    try {
        const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id, role, organizations ( name, logo_url )")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        const orgData = (membership as any)?.organizations;

        return {
            data: {
                userName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
                userEmail: user.email || "",
                userInitial: (user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase(),
                orgName: orgData?.name || "Minha Empresa",
                orgLogoUrl: orgData?.logo_url || null,
                role: membership?.role || "member",
            },
            error: null,
        };
    } catch {
        return { data: null, error: "Falha ao buscar dados do sidebar" };
    }
}

// ── Membros da organização ──
export async function getOrgMembers(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("organization_members")
            .select("id, user_id, role, created_at, profiles ( full_name, email, avatar_url )")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: true });

        if (error) {
            // profiles table might not exist as a join — try without it
            const { data: fallbackData, error: fallbackErr } = await supabase
                .from("organization_members")
                .select("id, user_id, role, created_at")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: true });

            if (fallbackErr) return { data: [], error: fallbackErr.message };

            // Enrich with auth metadata for each member
            const enriched = (fallbackData || []).map(m => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                name: m.user_id === user.id ? (user.user_metadata?.full_name || user.email?.split("@")[0] || "Você") : "Membro",
                email: m.user_id === user.id ? (user.email || "") : "",
                created_at: m.created_at,
            }));
            return { data: enriched, error: null };
        }

        const members = (data || []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            name: m.profiles?.full_name || (m.user_id === user.id ? (user.user_metadata?.full_name || user.email?.split("@")[0]) : "Membro"),
            email: m.profiles?.email || (m.user_id === user.id ? user.email : ""),
            avatar_url: m.profiles?.avatar_url || null,
            created_at: m.created_at,
        }));
        return { data: members, error: null };
    } catch {
        return { data: [], error: "Falha ao buscar membros" };
    }
}
