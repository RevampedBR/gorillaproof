"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ── Groups CRUD ──

export async function getGroups(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("contact_groups")
            .select(`
                id, name, description, created_at, updated_at,
                contact_group_members ( id, user_id )
            `)
            .eq("organization_id", orgId)
            .order("name", { ascending: true });

        if (error) return { data: [], error: error.message };

        const groups = (data || []).map((g: any) => ({
            ...g,
            member_count: g.contact_group_members?.length || 0,
        }));

        return { data: groups, error: null };
    } catch {
        return { data: [], error: "Falha ao buscar grupos" };
    }
}

export async function createGroup(orgId: string, name: string, description?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };
    if (!name?.trim()) return { data: null, error: "Nome é obrigatório" };

    try {
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .single();

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return { data: null, error: "Apenas administradores podem criar grupos" };
        }

        const { data, error } = await supabase
            .from("contact_groups")
            .insert({
                organization_id: orgId,
                name: name.trim(),
                description: description?.trim() || null,
                created_by: user.id,
            })
            .select("id, name, description")
            .single();

        if (error) {
            if (error.code === "23505") return { data: null, error: "Já existe um grupo com esse nome" };
            return { data: null, error: error.message };
        }

        revalidatePath("/members");
        return { data, error: null };
    } catch {
        return { data: null, error: "Falha ao criar grupo" };
    }
}

export async function updateGroup(groupId: string, name: string, description?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    if (!name?.trim()) return { error: "Nome é obrigatório" };

    try {
        const { error } = await supabase
            .from("contact_groups")
            .update({
                name: name.trim(),
                description: description?.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", groupId);

        if (error) {
            if (error.code === "23505") return { error: "Já existe um grupo com esse nome" };
            return { error: error.message };
        }

        revalidatePath("/members");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar grupo" };
    }
}

export async function deleteGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("contact_groups")
            .delete()
            .eq("id", groupId);

        if (error) return { error: error.message };

        revalidatePath("/members");
        return { error: null };
    } catch {
        return { error: "Falha ao excluir grupo" };
    }
}

// ── Group Members ──

export async function getGroupMembers(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("contact_group_members")
            .select(`
                id, user_id, created_at,
                users ( id, email, full_name, avatar_url )
            `)
            .eq("group_id", groupId)
            .order("created_at", { ascending: true });

        if (error) return { data: [], error: error.message };
        return { data: data ?? [], error: null };
    } catch {
        return { data: [], error: "Falha ao buscar membros do grupo" };
    }
}

export async function addGroupMember(groupId: string, userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("contact_group_members")
            .insert({
                group_id: groupId,
                user_id: userId,
                added_by: user.id,
            });

        if (error) {
            if (error.code === "23505") return { error: "Membro já está no grupo" };
            return { error: error.message };
        }

        revalidatePath("/members");
        return { error: null };
    } catch {
        return { error: "Falha ao adicionar membro" };
    }
}

export async function removeGroupMember(memberId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("contact_group_members")
            .delete()
            .eq("id", memberId);

        if (error) return { error: error.message };

        revalidatePath("/members");
        return { error: null };
    } catch {
        return { error: "Falha ao remover membro" };
    }
}

// ── Proof Access Assignments ──

export async function getProofAssignments(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("proof_access_assignments")
            .select(`
                id, created_at,
                group_id, user_id,
                contact_groups ( id, name ),
                users ( id, email, full_name, avatar_url )
            `)
            .eq("proof_id", proofId)
            .order("created_at", { ascending: true });

        if (error) return { data: [], error: error.message };
        return { data: data ?? [], error: null };
    } catch {
        return { data: [], error: "Falha ao buscar atribuições" };
    }
}

export async function assignToProof(
    proofId: string,
    target: { groupId?: string; userId?: string }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    if (!target.groupId && !target.userId) return { error: "Selecione um grupo ou pessoa" };

    try {
        const { error } = await supabase
            .from("proof_access_assignments")
            .insert({
                proof_id: proofId,
                group_id: target.groupId || null,
                user_id: target.userId || null,
                assigned_by: user.id,
            });

        if (error) {
            if (error.code === "23505") return { error: "Já atribuído" };
            return { error: error.message };
        }

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao atribuir acesso" };
    }
}

export async function removeProofAssignment(assignmentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proof_access_assignments")
            .delete()
            .eq("id", assignmentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao remover atribuição" };
    }
}

export async function setProofAccessMode(proofId: string, mode: "org_wide" | "restricted") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ access_mode: mode })
            .eq("id", proofId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar modo de acesso" };
    }
}

// ── Project Access Assignments ──

export async function getProjectAssignments(projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("project_access_assignments")
            .select(`
                id, created_at,
                group_id, user_id,
                contact_groups ( id, name ),
                users ( id, email, full_name, avatar_url )
            `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });

        if (error) return { data: [], error: error.message };
        return { data: data ?? [], error: null };
    } catch {
        return { data: [], error: "Falha ao buscar atribuições do projeto" };
    }
}

export async function assignToProject(
    projectId: string,
    target: { groupId?: string; userId?: string }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    if (!target.groupId && !target.userId) return { error: "Selecione um grupo ou pessoa" };

    try {
        const { error } = await supabase
            .from("project_access_assignments")
            .insert({
                project_id: projectId,
                group_id: target.groupId || null,
                user_id: target.userId || null,
                assigned_by: user.id,
            });

        if (error) {
            if (error.code === "23505") return { error: "Já atribuído" };
            return { error: error.message };
        }

        revalidatePath("/dashboard");
        return { error: null };
    } catch {
        return { error: "Falha ao atribuir acesso ao projeto" };
    }
}

export async function removeProjectAssignment(assignmentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("project_access_assignments")
            .delete()
            .eq("id", assignmentId);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        return { error: null };
    } catch {
        return { error: "Falha ao remover atribuição do projeto" };
    }
}

export async function setProjectAccessMode(projectId: string, mode: "org_wide" | "restricted") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("projects")
            .update({ access_mode: mode })
            .eq("id", projectId);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        return { error: null };
    } catch {
        return { error: "Falha ao atualizar modo de acesso do projeto" };
    }
}
