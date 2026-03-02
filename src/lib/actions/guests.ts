"use server";

import { createClient } from "@/utils/supabase/server";

interface ValidateResult {
    valid: boolean;
    proof?: {
        id: string;
        title: string;
        status: string;
        deadline: string | null;
        locked_at: string | null;
        project_id: string;
        projects?: { id: string; name: string; organization_id: string } | null;
    };
    error?: string;
}

export async function validateShareToken(token: string): Promise<ValidateResult> {
    if (!token) return { valid: false, error: "Token ausente" };

    const supabase = await createClient();

    const { data: proof, error } = await supabase
        .from("proofs")
        .select(`
            id, title, status, deadline, locked_at, project_id,
            share_token_expires_at,
            projects ( id, name, organization_id )
        `)
        .eq("share_token", token)
        .single();

    if (error || !proof) return { valid: false, error: "Link inválido ou expirado" };

    // Check expiration
    if (proof.share_token_expires_at) {
        const expiresAt = new Date(proof.share_token_expires_at);
        if (expiresAt < new Date()) {
            return { valid: false, error: "Este link de revisão expirou" };
        }
    }

    return {
        valid: true,
        proof: {
            id: proof.id,
            title: proof.title,
            status: proof.status,
            deadline: proof.deadline,
            locked_at: proof.locked_at,
            project_id: proof.project_id,
            projects: proof.projects as any,
        },
    };
}

interface GuestInfo {
    id: string;
    displayName: string;
    email?: string;
}

export async function registerGuest(
    token: string,
    displayName: string,
    email?: string
): Promise<{ guest: GuestInfo | null; error: string | null }> {
    if (!displayName?.trim()) return { guest: null, error: "Nome é obrigatório" };

    const supabase = await createClient();

    // Validate token first
    const validation = await validateShareToken(token);
    if (!validation.valid) return { guest: null, error: validation.error || "Token inválido" };

    // Check if this guest already registered (by email or name+proof combo)
    if (email) {
        const { data: existing } = await supabase
            .from("guest_reviewers")
            .select("id, display_name, email")
            .eq("proof_id", validation.proof!.id)
            .eq("email", email)
            .single();

        if (existing) {
            return {
                guest: { id: existing.id, displayName: existing.display_name, email: existing.email || undefined },
                error: null,
            };
        }
    }

    const { data, error } = await supabase
        .from("guest_reviewers")
        .insert({
            proof_id: validation.proof!.id,
            display_name: displayName.trim(),
            email: email?.trim() || null,
            token,
        })
        .select("id, display_name, email")
        .single();

    if (error) return { guest: null, error: error.message };

    return {
        guest: { id: data.id, displayName: data.display_name, email: data.email || undefined },
        error: null,
    };
}

export async function getGuestsByProof(proofId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("guest_reviewers")
        .select("id, display_name, email, created_at")
        .eq("proof_id", proofId)
        .order("created_at", { ascending: true });

    return { data: data ?? [], error: error?.message ?? null };
}

export async function createGuestComment(
    versionId: string,
    content: string,
    proofId: string,
    guestId: string,
    posX?: number | null,
    posY?: number | null,
    videoTimestamp?: number | null,
    parentCommentId?: string | null
) {
    const supabase = await createClient();

    // Check if proof is locked
    const { data: proof } = await supabase
        .from("proofs")
        .select("locked_at")
        .eq("id", proofId)
        .single();
    if (proof?.locked_at) return { error: "Prova está travada", data: null };

    const { data, error } = await supabase
        .from("comments")
        .insert({
            version_id: versionId,
            guest_reviewer_id: guestId,
            user_id: null,
            content,
            pos_x: posX ?? null,
            pos_y: posY ?? null,
            video_timestamp: videoTimestamp ?? null,
            parent_comment_id: parentCommentId ?? null,
            is_internal: false,
        })
        .select(`
            id, content, pos_x, pos_y, video_timestamp,
            status, parent_comment_id, created_at,
            user_id, guest_reviewer_id, is_internal,
            guest_reviewers ( id, display_name, email )
        `)
        .single();

    if (error) return { error: error.message, data: null };
    return { error: null, data };
}

export async function submitGuestDecision(
    proofId: string,
    decision: string,
    guestId: string
) {
    const supabase = await createClient();

    // Check if proof is locked
    const { data: proof } = await supabase
        .from("proofs")
        .select("locked_at")
        .eq("id", proofId)
        .single();
    if (proof?.locked_at) return { error: "Prova está travada" };

    const { error } = await supabase
        .from("proof_decisions")
        .upsert({
            proof_id: proofId,
            guest_reviewer_id: guestId,
            user_id: null,
            decision,
            decided_at: new Date().toISOString(),
        }, { onConflict: "proof_id,guest_reviewer_id" });

    if (error) return { error: error.message };
    return { error: null };
}

export async function revokeShareToken(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
        .from("proofs")
        .update({ share_token: null, share_token_expires_at: null })
        .eq("id", proofId);

    if (error) return { error: error.message };
    return { error: null };
}

export async function setShareTokenExpiration(proofId: string, expiresAt: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
        .from("proofs")
        .update({ share_token_expires_at: expiresAt })
        .eq("id", proofId);

    if (error) return { error: error.message };
    return { error: null };
}
