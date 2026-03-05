"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ── Fetch all clients (with nested projects + proof counts) ──
export async function getClients() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Não autenticado" };

    const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
        return { data: [], error: null };
    }

    const orgIds = memberships.map((m) => m.organization_id);

    const { data, error } = await supabase
        .from("clients")
        .select(`
            id,
            name,
            description,
            contact_email,
            contact_phone,
            segment,
            logo_url,
            status,
            organization_id,
            created_at,
            updated_at,
            projects (
                id,
                name,
                description,
                status,
                created_at,
                updated_at,
                proofs ( id, title, status, tags, updated_at, deadline )
            ),
            proofs!proofs_client_id_fkey (
                id, title, status, tags, updated_at, deadline, project_id
            )
        `)
        .in("organization_id", orgIds)
        .order("updated_at", { ascending: false });

    return {
        data: data ?? [],
        error: error?.message ?? null,
    };
}

// ── Create a new client ──
export async function createClientAction(formData: FormData): Promise<{ id?: string; error: string | null }> {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Nome é obrigatório" };
    if (name.length > 200) return { error: "Nome muito longo (máx 200)" };
    const description = ((formData.get("description") as string) || "").trim().slice(0, 1000);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership) return { error: "Nenhuma organização encontrada" };

        const contact_email = ((formData.get("contact_email") as string) || "").trim().slice(0, 200);
        const contact_phone = ((formData.get("contact_phone") as string) || "").trim().slice(0, 30);
        const segment = ((formData.get("segment") as string) || "").trim();
        const logo_url = ((formData.get("logo_url") as string) || "").trim();

        const { data: created, error } = await supabase.from("clients").insert({
            name: name.replace(/<[^>]+>/g, ""),
            description: description ? description.replace(/<[^>]+>/g, "") : null,
            contact_email: contact_email || null,
            contact_phone: contact_phone || null,
            segment: segment || null,
            logo_url: logo_url || null,
            organization_id: membership.organization_id,
        }).select("id").single();

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        revalidatePath("/clients");
        return { id: created?.id, error: null };
    } catch {
        return { error: "Falha ao criar cliente" };
    }
}

// ── Update client ──
export async function updateClient(id: string, formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Nome é obrigatório" };
    const description = ((formData.get("description") as string) || "").trim().slice(0, 1000);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const contact_email = ((formData.get("contact_email") as string) || "").trim().slice(0, 200);
        const contact_phone = ((formData.get("contact_phone") as string) || "").trim().slice(0, 30);
        const segment = ((formData.get("segment") as string) || "").trim();
        const logo_url = ((formData.get("logo_url") as string) || "").trim();

        const { error } = await supabase
            .from("clients")
            .update({
                name: name.replace(/<[^>]+>/g, ""),
                description: description ? description.replace(/<[^>]+>/g, "") : null,
                contact_email: contact_email || null,
                contact_phone: contact_phone || null,
                segment: segment || null,
                logo_url: logo_url || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar cliente" };
    }
}

// ── Delete (archive) client ──
export async function deleteClient(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("clients")
            .update({ status: "archived" })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao arquivar cliente" };
    }
}
