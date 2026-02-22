"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getReviewers(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("proof_reviewers")
            .select(`
                id, role, assigned_at, user_id,
                users ( id, email, full_name, avatar_url )
            `)
            .eq("proof_id", proofId)
            .order("assigned_at", { ascending: true });

        return { data: data ?? [], error: error?.message ?? null };
    } catch (err) {
        return { data: [], error: "Failed to fetch reviewers" };
    }
}

export async function assignReviewer(proofId: string, userId: string, role: string = "reviewer") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proof_reviewers")
            .upsert({
                proof_id: proofId,
                user_id: userId,
                role,
            }, { onConflict: "proof_id,user_id" });

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to assign reviewer" };
    }
}

export async function removeReviewer(proofId: string, userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proof_reviewers")
            .delete()
            .eq("proof_id", proofId)
            .eq("user_id", userId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to remove reviewer" };
    }
}
