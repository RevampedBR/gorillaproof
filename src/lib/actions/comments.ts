"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/actions/activity";

export async function getComments(versionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    try {
        const { data, error } = await supabase
            .from("comments")
            .select(`
                id, content, pos_x, pos_y, video_timestamp,
                status, parent_comment_id, created_at, updated_at,
                user_id, attachment_url, is_internal, guest_reviewer_id,
                annotation_shape,
                users ( id, full_name, avatar_url, email ),
                guest_reviewers ( id, display_name, email )
            `)
            .eq("version_id", versionId)
            .order("created_at", { ascending: true });

        return { data: data ?? [], error: error?.message ?? null };
    } catch {
        return { data: [], error: "Falha ao buscar comentários" };
    }
}

export async function createComment(
    versionId: string,
    content: string,
    proofId: string,
    posX?: number | null,
    posY?: number | null,
    videoTimestamp?: number | null,
    parentCommentId?: string | null,
    attachmentUrl?: string | null,
    isInternal?: boolean,
    annotationShape?: Record<string, unknown> | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Não autenticado", data: null };

    // Check if proof is locked (use admin to bypass RLS)
    const { data: proof } = await supabaseAdmin
        .from("proofs")
        .select("locked_at")
        .eq("id", proofId)
        .single();
    if (proof?.locked_at) return { error: "Prova está travada", data: null };

    try {
        const insertPayload = {
            version_id: versionId,
            user_id: user.id,
            content,
            pos_x: posX ?? null,
            pos_y: posY ?? null,
            video_timestamp: videoTimestamp ?? null,
            parent_comment_id: parentCommentId ?? null,
            attachment_url: attachmentUrl ?? null,
            is_internal: isInternal ?? false,
            annotation_shape: annotationShape ?? null,
        };
        console.log("[createComment] Inserting:", JSON.stringify(insertPayload, null, 2));

        const { data, error } = await supabaseAdmin
            .from("comments")
            .insert(insertPayload)
            .select(`
                id, content, pos_x, pos_y, video_timestamp,
                status, parent_comment_id, created_at,
                user_id, attachment_url, is_internal,
                annotation_shape,
                users ( id, full_name, avatar_url, email )
            `)
            .single();

        if (error) {
            console.error("[createComment] Insert failed:", error.message, error.details, error.hint);
            return { error: error.message, data: null };
        }

        console.log("[createComment] Success! Comment ID:", data.id);
        await logActivity({ proofId, action: "comment_added", metadata: { commentId: data.id, hasAnnotation: !!(posX && posY) } });

        revalidatePath(`/proofs/${proofId}`);
        return { error: null, data };
    } catch (err) {
        console.error("[createComment] Exception:", err);
        return { error: "Falha ao criar comentário", data: null };
    }
}

export async function resolveComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("comments")
            .update({ status: "resolved", updated_at: new Date().toISOString() })
            .eq("id", commentId);

        if (error) return { error: error.message };

        await logActivity({ proofId, action: "comment_resolved", metadata: { commentId } });

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao resolver comentário" };
    }
}

export async function reopenComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("comments")
            .update({ status: "open", updated_at: new Date().toISOString() })
            .eq("id", commentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao reabrir comentário" };
    }
}

export async function deleteComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    try {
        const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", commentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch {
        return { error: "Falha ao excluir comentário" };
    }
}

export async function carryCommentsForward(fromVersionId: string, toVersionId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: "Não autenticado" };

    try {
        // Get open comments from the previous version
        const { data: oldComments } = await supabase
            .from("comments")
            .select("content, pos_x, pos_y, video_timestamp, user_id, is_internal, annotation_shape")
            .eq("version_id", fromVersionId)
            .eq("status", "open")
            .is("parent_comment_id", null);

        if (!oldComments || oldComments.length === 0) return { count: 0, error: null };

        // Insert copies into the new version
        const newComments = oldComments.map((c) => ({
            version_id: toVersionId,
            user_id: c.user_id,
            content: c.content,
            pos_x: c.pos_x,
            pos_y: c.pos_y,
            video_timestamp: c.video_timestamp,
            is_internal: c.is_internal ?? false,
            annotation_shape: c.annotation_shape ?? null,
        }));

        const { error } = await supabase.from("comments").insert(newComments);
        if (error) return { count: 0, error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { count: newComments.length, error: null };
    } catch {
        return { count: 0, error: "Falha ao transferir comentários" };
    }
}
