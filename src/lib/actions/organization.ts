"use server";

import { createClient } from "@/utils/supabase/server";

export async function getOrgSettings(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("organizations")
            .select("id, name, logo_url, brand_color, custom_domain, created_at")
            .eq("id", orgId)
            .single();

        if (error) return { data: null, error: error.message };
        return { data, error: null };
    } catch (err) {
        return { data: null, error: "Failed to fetch org settings" };
    }
}

export async function updateOrgSettings(orgId: string, updates: {
    name?: string;
    logo_url?: string;
    brand_color?: string;
    custom_domain?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        // Verify user is admin of this org
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .single();

        if (!membership || membership.role !== "admin") return { error: "Only admins can update org settings" };

        const { error } = await supabase
            .from("organizations")
            .update(updates)
            .eq("id", orgId);

        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: "Failed to update org settings" };
    }
}

export async function getOrgUsageStats(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

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
    } catch (err) {
        return { data: null, error: "Failed to fetch usage stats" };
    }
}
