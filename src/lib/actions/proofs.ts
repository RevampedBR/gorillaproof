"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/actions/activity";

export async function getAllProofs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data: memberships } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id);

        if (!memberships || memberships.length === 0) return { data: [], error: null };

        const orgIds = memberships.map((m) => m.organization_id);

        // 1. Proofs inside projects
        const { data: projects, error } = await supabase
            .from("projects")
            .select(`
                id,
                name,
                proofs (
                    id, title, status, deadline, locked_at, tags,
                    project_id, client_id, created_at, updated_at,
                    versions ( id, file_url, comments ( id, status ) )
                )
            `)
            .in("organization_id", orgIds);

        if (error) return { data: [], error: error.message };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projectProofs = (projects ?? []).flatMap((project: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (project.proofs || []).map((proof: any) => ({
                ...proof,
                project_name: project.name,
            }))
        );

        // 2. Loose proofs (no project)
        const { data: clients } = await supabase
            .from("clients")
            .select(`
                id, name,
                proofs!proofs_client_id_fkey (
                    id, title, status, deadline, locked_at, tags,
                    project_id, client_id, created_at, updated_at,
                    versions ( id, file_url, comments ( id, status ) )
                )
            `)
            .in("organization_id", orgIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const looseProofs = (clients ?? []).flatMap((client: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client.proofs || []).filter((p: any) => !p.project_id).map((proof: any) => ({
                ...proof,
                project_name: null,
                client_name: client.name,
            }))
        );

        const allProofs = [...projectProofs, ...looseProofs];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allProofs.sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        return { data: allProofs, error: null };
    } catch {
        return { data: [], error: "Falha ao buscar provas" };
    }
}


export async function getProofs(projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("proofs")
            .select(`
                id,
                title,
                status,
                file_type,
                deadline,
                locked_at,
                tags,
                share_token,
                created_at,
                updated_at,
                versions ( id, file_url, comments ( id, status ) )
            `)
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        return {
            data: data ?? [],
            error: error?.message ?? null,
        };
    } catch {
        return { data: [], error: "Falha ao buscar provas" };
    }
}

export async function createProof(clientId: string, formData: FormData, projectId?: string | null) {
    const title = (formData.get("title") as string)?.trim();
    if (!title || title.length === 0) return { error: "Título é obrigatório" };
    if (title.length > 200) return { error: "Título muito longo (máx 200)" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        // 1. Get org_id for storage path (from client or project)
        let orgId: string;
        if (projectId) {
            const { data: project } = await supabase
                .from("projects")
                .select("organization_id")
                .eq("id", projectId)
                .single();
            if (!project) return { error: "Projeto não encontrado" };
            orgId = project.organization_id;
        } else {
            const { data: client } = await supabase
                .from("clients")
                .select("organization_id")
                .eq("id", clientId)
                .single();
            if (!client) return { error: "Cliente não encontrado" };
            orgId = client.organization_id;
        }

        // 2. Create the proof
        const { data: proof, error: proofError } = await supabase.from("proofs").insert({
            title: title.replace(/<[^>]+>/g, ""),
            client_id: clientId,
            project_id: projectId || null,
            status: "draft",
        }).select("id").single();

        if (proofError) return { error: proofError.message };
        if (!proof) return { error: "Erro ao criar prova" };

        await logActivity({ proofId: proof.id, action: "proof_created", metadata: { title: title.replace(/<[^>]+>/g, "") } });

        // 3. Upload files and create version rows
        const files = formData.getAll("files") as File[];
        const storageBucket = projectId || clientId;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
                const storagePath = `${orgId}/${storageBucket}/${proof.id}/v${i + 1}-${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("proofs")
                    .upload(storagePath, file, { cacheControl: "3600", upsert: true });

                if (!uploadError) {
                    await supabase.from("versions").insert({
                        proof_id: proof.id,
                        version_number: i + 1,
                        file_url: storagePath,
                        file_type: file.type || "application/octet-stream",
                        uploaded_by: user.id,
                    });
                }
            }
        }

        revalidatePath("/clients");
        return { id: proof.id, error: null };
    } catch {
        return { error: "Falha ao criar prova" };
    }
}

export async function updateProofStatus(id: string, status: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        // Check if proof is locked
        const { data: proof } = await supabase.from("proofs").select("locked_at").eq("id", id).single();
        if (proof?.locked_at) return { error: "Prova está travada" };

        const { error } = await supabase
            .from("proofs")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { error: error.message };

        await logActivity({ proofId: id, action: "status_changed", metadata: { status } });

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar status" };
    }
}

export async function deleteProof(id: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proofs")
            .delete()
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao excluir prova" };
    }
}

export async function updateProofDeadline(id: string, deadline: string | null, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ deadline, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar prazo" };
    }
}

export async function getOrgMembers(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("organization_members")
            .select(`
                user_id,
                role,
                users ( id, email, full_name, avatar_url )
            `)
            .eq("organization_id", orgId);

        return {
            data: data ?? [],
            error: error?.message ?? null,
        };
    } catch {
        return { data: [], error: "Falha ao buscar membros" };
    }
}

export async function updateProofTags(id: string, tags: string[], projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ tags })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar tags" };
    }
}

export async function bulkUpdateProofStatus(ids: string[], status: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ status, updated_at: new Date().toISOString() })
            .in("id", ids)
            .is("locked_at", null);

        if (error) return { error: error.message };

        for (const proofId of ids) {
            await logActivity({ proofId, action: "status_changed", metadata: { status, bulk: true } });
        }

        revalidatePath("/clients");
        return { error: null, count: ids.length };
    } catch {
        return { error: "Falha ao atualizar em lote" };
    }
}

export async function generateShareToken(proofId: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", token: null };

    try {
        const token = crypto.randomUUID().replace(/-/g, "");
        const { error } = await supabase
            .from("proofs")
            .update({ share_token: token })
            .eq("id", proofId);

        if (error) return { error: error.message, token: null };

        revalidatePath("/clients");
        return { error: null, token };
    } catch {
        return { error: "Falha ao gerar link de compartilhamento", token: null };
    }
}

export async function getClientProofs(clientId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("proofs")
            .select(`
                id, title, status, file_type, deadline, locked_at, tags,
                share_token, created_at, updated_at,
                versions ( id, file_url, comments ( id, status ) )
            `)
            .eq("client_id", clientId)
            .is("project_id", null)
            .order("updated_at", { ascending: false });

        return { data: data ?? [], error: error?.message ?? null };
    } catch {
        return { data: [], error: "Falha ao buscar provas do cliente" };
    }
}
