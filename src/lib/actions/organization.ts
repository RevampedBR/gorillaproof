"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

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

// ── Convidar membro por e-mail ──
export async function inviteMember(
    orgId: string,
    email: string,
    role: "member" | "reviewer" = "member",
    groupId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    if (!email?.trim()) return { error: "E-mail é obrigatório" };

    const normalizedEmail = email.trim().toLowerCase();

    try {
        // Verify caller is admin/owner
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .single();

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return { error: "Apenas administradores podem convidar membros" };
        }

        // Check if email is already a member of this org
        const { data: existingMembers } = await supabaseAdmin
            .from("organization_members")
            .select("id, user_id")
            .eq("organization_id", orgId);

        if (existingMembers && existingMembers.length > 0) {
            // Check each existing member's email
            for (const em of existingMembers) {
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(em.user_id);
                if (userData?.user?.email?.toLowerCase() === normalizedEmail) {
                    // Already a member — if groupId provided, add to group instead
                    if (groupId) {
                        const { error: gmError } = await supabaseAdmin
                            .from("contact_group_members")
                            .insert({
                                group_id: groupId,
                                user_id: em.user_id,
                                added_by: user.id,
                            });
                        if (gmError && gmError.code !== "23505") return { error: gmError.message };
                        revalidatePath("/members");
                        return { error: null, alreadyMember: true, addedToGroup: true };
                    }
                    return { error: "Este e-mail já é membro da organização" };
                }
            }
        }

        // Try to find existing auth user by email
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === normalizedEmail
        );

        let targetUserId: string;

        if (existingUser) {
            targetUserId = existingUser.id;
        } else {
            // Invite via email (Mailtrap will send the invite)
            const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail);
            if (inviteErr || !invited?.user) {
                return { error: inviteErr?.message || "Falha ao enviar convite" };
            }
            targetUserId = invited.user.id;
        }

        // Add to organization
        const { error: insertErr } = await supabaseAdmin
            .from("organization_members")
            .insert({
                organization_id: orgId,
                user_id: targetUserId,
                role,
            });

        if (insertErr) {
            if (insertErr.code === "23505") return { error: "Este e-mail já é membro da organização" };
            return { error: insertErr.message };
        }

        // If groupId provided, also add to group
        if (groupId) {
            await supabaseAdmin
                .from("contact_group_members")
                .insert({
                    group_id: groupId,
                    user_id: targetUserId,
                    added_by: user.id,
                });
        }

        revalidatePath("/members");
        return { error: null };
    } catch (err: any) {
        return { error: err?.message || "Falha ao convidar membro" };
    }
}
