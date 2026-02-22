"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type ProofDecision = "approved" | "approved_with_changes" | "changes_requested" | "not_relevant" | "rejected";

export async function submitDecision(proofId: string, decision: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Check if proof is locked
    const { data: proof } = await supabase.from("proofs").select("locked_at").eq("id", proofId).single();
    if (proof?.locked_at) return { error: "Proof is locked" };

    try {
        const { error } = await supabase
            .from("proof_decisions")
            .upsert({
                proof_id: proofId,
                user_id: user.id,
                decision,
                decided_at: new Date().toISOString(),
            }, { onConflict: "proof_id,user_id" });

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to submit decision" };
    }
}

export async function getDecisions(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("proof_decisions")
            .select(`
                id, decision, decided_at, user_id,
                users ( id, full_name, avatar_url, email )
            `)
            .eq("proof_id", proofId)
            .order("decided_at", { ascending: false });

        return { data: data ?? [], error: error?.message ?? null };
    } catch (err) {
        return { data: [], error: "Failed to fetch decisions" };
    }
}

export async function lockProof(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ locked_at: new Date().toISOString() })
            .eq("id", proofId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to lock proof" };
    }
}

export async function unlockProof(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ locked_at: null })
            .eq("id", proofId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to unlock proof" };
    }
}
