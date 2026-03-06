"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface ChecklistItem {
    id: string;
    proof_id: string;
    label: string;
    checked: boolean;
    checked_by: string | null;
    checked_at: string | null;
    position: number;
    created_at: string;
    created_by: string | null;
    users?: { full_name: string | null } | null;
}

export async function getChecklistItems(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    const { data, error } = await supabase
        .from("proof_checklist_items")
        .select("id, proof_id, label, checked, checked_by, checked_at, position, created_at, created_by")
        .eq("proof_id", proofId)
        .order("position", { ascending: true });

    return { data: (data ?? []) as ChecklistItem[], error: error?.message ?? null };
}

export async function addChecklistItem(proofId: string, label: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    if (!label.trim()) return { error: "Item não pode ser vazio", data: null };

    // Get max position
    const { data: existing } = await supabase
        .from("proof_checklist_items")
        .select("position")
        .eq("proof_id", proofId)
        .order("position", { ascending: false })
        .limit(1);

    const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const { data, error } = await supabase
        .from("proof_checklist_items")
        .insert({
            proof_id: proofId,
            label: label.trim(),
            position: nextPos,
            created_by: user.id,
        })
        .select("id, proof_id, label, checked, checked_by, checked_at, position, created_at, created_by")
        .single();

    if (error) return { error: error.message, data: null };
    revalidatePath(`/proofs/${proofId}`);
    return { error: null, data: data as ChecklistItem };
}

export async function toggleChecklistItem(itemId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Get current state
    const { data: item } = await supabase
        .from("proof_checklist_items")
        .select("checked")
        .eq("id", itemId)
        .single();

    if (!item) return { error: "Item não encontrado" };

    const newChecked = !item.checked;
    const { error } = await supabase
        .from("proof_checklist_items")
        .update({
            checked: newChecked,
            checked_by: newChecked ? user.id : null,
            checked_at: newChecked ? new Date().toISOString() : null,
        })
        .eq("id", itemId);

    if (error) return { error: error.message };
    revalidatePath(`/proofs/${proofId}`);
    return { error: null };
}

export async function removeChecklistItem(itemId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
        .from("proof_checklist_items")
        .delete()
        .eq("id", itemId);

    if (error) return { error: error.message };
    revalidatePath(`/proofs/${proofId}`);
    return { error: null };
}
