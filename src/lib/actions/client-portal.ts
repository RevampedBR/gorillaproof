"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Create a new Client Entity ──
export async function createClientEntity(name: string, slug?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    const cleanName = name.trim();
    if (!cleanName) return { data: null, error: "Nome é obrigatório" };

    const finalSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") ||
        cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Use admin client to bypass RLS — user auth already verified above
    const { data, error } = await supabaseAdmin
        .from("client_entities")
        .insert({
            name: cleanName,
            slug: finalSlug,
        })
        .select("id, name, slug")
        .single();

    if (error) {
        if (error.code === "23505") return { data: null, error: "Este slug já está em uso" };
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

// ── Search existing client entities ──
export async function searchClientEntities(query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    // Use admin to bypass RLS — search needs to find entities not yet linked to user
    const { data, error } = await supabaseAdmin
        .from("client_entities")
        .select("id, name, slug, logo_url")
        .ilike("name", `%${query.trim()}%`)
        .limit(10);

    return { data: data ?? [], error: error?.message ?? null };
}

// ── Get a single client entity ──
export async function getClientEntity(entityId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    const { data, error } = await supabase
        .from("client_entities")
        .select("id, name, slug, logo_url, created_at")
        .eq("id", entityId)
        .single();

    return { data, error: error?.message ?? null };
}

// ── Link an agency client to a client entity ──
export async function linkClientToEntity(clientId: string, entityId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Verify user is admin/owner of the client's org
    const { data: client } = await supabase
        .from("clients")
        .select("id, organization_id")
        .eq("id", clientId)
        .single();

    if (!client) return { error: "Cliente não encontrado" };

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", client.organization_id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return { error: "Apenas administradores podem vincular clientes ao portal" };
    }

    // Use admin client — RLS verified via membership check above
    const { error } = await supabaseAdmin
        .from("client_entity_links")
        .insert({
            client_id: clientId,
            client_entity_id: entityId,
            linked_by: user.id,
        });

    if (error) {
        if (error.code === "23505") return { error: "Este cliente já está vinculado a um portal" };
        return { error: error.message };
    }

    revalidatePath("/clients");
    return { error: null };
}

// ── Unlink a client from its entity ──
export async function unlinkClientFromEntity(clientId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Use admin client to bypass RLS
    const { error } = await supabaseAdmin
        .from("client_entity_links")
        .delete()
        .eq("client_id", clientId);

    if (error) return { error: error.message };

    revalidatePath("/clients");
    return { error: null };
}

// ── Get entity link for a specific client ──
export async function getClientEntityLink(clientId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    // Use admin to reliably fetch across RLS boundaries
    const { data, error } = await supabaseAdmin
        .from("client_entity_links")
        .select("id, client_entity_id, client_entities ( id, name, slug, logo_url )")
        .eq("client_id", clientId)
        .maybeSingle();

    return { data, error: error?.message ?? null };
}

// ── Invite a client user to the portal ──
export async function inviteClientUser(
    entityId: string,
    email: string,
    role: "viewer" | "approver" | "admin" = "viewer"
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { error: "E-mail é obrigatório" };

    // Check if this email already has a client_user record for this entity
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = userList?.users?.find(
        u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
        // Check if already a client_user
        const { data: existing } = await supabaseAdmin
            .from("client_users")
            .select("id")
            .eq("user_id", existingAuthUser.id)
            .eq("client_entity_id", entityId)
            .maybeSingle();

        if (existing) return { error: "Este e-mail já tem acesso ao portal" };

        // Create client_user record
        const { error } = await supabaseAdmin
            .from("client_users")
            .insert({
                user_id: existingAuthUser.id,
                client_entity_id: entityId,
                role,
                invited_by: user.id,
            });

        if (error) return { error: error.message };
        return { error: null };
    }

    // User doesn't exist — invite via email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
            redirectTo: `${siteUrl}/auth/callback?portal_entity=${entityId}&portal_role=${role}`,
            data: {
                portal_entity_id: entityId,
                portal_role: role,
            },
        }
    );

    if (inviteErr || !invited?.user) {
        return { error: inviteErr?.message || "Falha ao enviar convite" };
    }

    // Pre-create client_user record
    const { error } = await supabaseAdmin
        .from("client_users")
        .insert({
            user_id: invited.user.id,
            client_entity_id: entityId,
            role,
            invited_by: user.id,
        });

    if (error) return { error: error.message };
    return { error: null };
}

// ── List client users for an entity ──
export async function getClientUsers(entityId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    const { data, error } = await supabase
        .from("client_users")
        .select("id, user_id, role, created_at")
        .eq("client_entity_id", entityId)
        .order("created_at", { ascending: true });

    if (error) return { data: [], error: error.message };

    // Enrich with user info
    const enriched = await Promise.all(
        (data || []).map(async (cu) => {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(cu.user_id);
            return {
                ...cu,
                email: userData?.user?.email || "",
                name: userData?.user?.user_metadata?.full_name || userData?.user?.email?.split("@")[0] || "Usuário",
            };
        })
    );

    return { data: enriched, error: null };
}

// ── Remove a client user ──
export async function removeClientUser(clientUserId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
        .from("client_users")
        .delete()
        .eq("id", clientUserId);

    if (error) return { error: error.message };
    return { error: null };
}
