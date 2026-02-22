"use server";

import { createClient } from "@/utils/supabase/server";

export type ProofDecision = "approved" | "approved_with_changes" | "changes_requested" | "not_relevant" | "rejected";

/**
 * Record the current user's decision on a proof.
 * Uses upsert so each user can only have one active decision per proof.
 */
export async function submitDecision(proofId: string, decision: ProofDecision, comment?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
        .from("proof_decisions")
        .upsert(
            {
                proof_id: proofId,
                user_id: user.id,
                decision,
                comment: comment || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "proof_id,user_id" }
        );

    return { error: error?.message ?? null };
}

/**
 * Get all decisions for a proof, with user info.
 */
export async function getDecisions(proofId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("proof_decisions")
        .select(`
            id, decision, comment, created_at, updated_at,
            users ( id, full_name, email )
        `)
        .eq("proof_id", proofId)
        .order("created_at", { ascending: true });

    return { data: data ?? [], error: error?.message ?? null };
}

/**
 * Lock a proof — sets locked_at timestamp, preventing further comments/decisions.
 */
export async function lockProof(proofId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("proofs")
        .update({ locked_at: new Date().toISOString() })
        .eq("id", proofId);

    return { error: error?.message ?? null };
}

/**
 * Unlock a proof.
 */
export async function unlockProof(proofId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("proofs")
        .update({ locked_at: null })
        .eq("id", proofId);

    return { error: error?.message ?? null };
}
