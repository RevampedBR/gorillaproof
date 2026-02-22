"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getComments(versionId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("comments")
        .select(`
            id, content, pos_x, pos_y, video_timestamp,
            status, parent_comment_id, created_at, updated_at,
            user_id, attachment_url, is_internal,
            users ( id, full_name, avatar_url, email )
        `)
        .eq("version_id", versionId)
        .order("created_at", { ascending: true });

    return { data: data ?? [], error: error?.message ?? null };
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
    isInternal?: boolean
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated", data: null };

    const { data, error } = await supabase
        .from("comments")
        .insert({
            version_id: versionId,
            user_id: user.id,
            content,
            pos_x: posX ?? null,
            pos_y: posY ?? null,
            video_timestamp: videoTimestamp ?? null,
            parent_comment_id: parentCommentId ?? null,
            attachment_url: attachmentUrl ?? null,
            is_internal: isInternal ?? false,
        })
        .select(`
            id, content, pos_x, pos_y, video_timestamp,
            status, parent_comment_id, created_at,
            user_id, attachment_url, is_internal,
            users ( id, full_name, avatar_url, email )
        `)
        .single();

    if (error) return { error: error.message, data: null };

    revalidatePath(`/proofs/${proofId}`);
    return { error: null, data };
}

export async function resolveComment(commentId: string, proofId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("comments")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", commentId);

    if (error) return { error: error.message };

    revalidatePath(`/proofs/${proofId}`);
    return { error: null };
}

export async function reopenComment(commentId: string, proofId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("comments")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", commentId);

    if (error) return { error: error.message };

    revalidatePath(`/proofs/${proofId}`);
    return { error: null };
}

export async function deleteComment(commentId: string, proofId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (error) return { error: error.message };

    revalidatePath(`/proofs/${proofId}`);
    return { error: null };
}

export async function carryCommentsForward(
    fromVersionId: string,
    toVersionId: string,
    proofId: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated", count: 0 };

    // Fetch open root comments from source version
    const { data: sourceComments, error: fetchErr } = await supabase
        .from("comments")
        .select("content, pos_x, pos_y, video_timestamp, user_id")
        .eq("version_id", fromVersionId)
        .eq("status", "open")
        .is("parent_comment_id", null)
        .order("created_at", { ascending: true });

    if (fetchErr || !sourceComments?.length) {
        return { error: fetchErr?.message ?? null, count: 0 };
    }

    // Copy to new version with carried-forward prefix
    const inserts = sourceComments.map((c) => ({
        version_id: toVersionId,
        user_id: c.user_id,
        content: `<em style="color:#a78bfa;font-size:11px">📋 Comentário da versão anterior:</em><br/>${c.content}`,
        pos_x: c.pos_x,
        pos_y: c.pos_y,
        video_timestamp: c.video_timestamp,
        status: "open" as const,
        parent_comment_id: null,
    }));

    const { error: insertErr } = await supabase
        .from("comments")
        .insert(inserts);

    if (insertErr) return { error: insertErr.message, count: 0 };

    revalidatePath(`/proofs/${proofId}`);
    return { error: null, count: inserts.length };
}
