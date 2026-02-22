"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getComments(versionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
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
    } catch (err) {
        return { data: [], error: "Failed to fetch comments" };
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
    isInternal?: boolean
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated", data: null };

    // Check if proof is locked
    const { data: proof } = await supabase
        .from("proofs")
        .select("locked_at")
        .eq("id", proofId)
        .single();
    if (proof?.locked_at) return { error: "Proof is locked", data: null };

    try {
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
    } catch (err) {
        return { error: "Failed to create comment", data: null };
    }
}

export async function resolveComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("comments")
            .update({ status: "resolved", updated_at: new Date().toISOString() })
            .eq("id", commentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to resolve comment" };
    }
}

export async function reopenComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("comments")
            .update({ status: "open", updated_at: new Date().toISOString() })
            .eq("id", commentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to reopen comment" };
    }
}

export async function deleteComment(commentId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", commentId);

        if (error) return { error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to delete comment" };
    }
}

export async function carryCommentsForward(fromVersionId: string, toVersionId: string, proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: "Not authenticated" };

    try {
        // Get open comments from the previous version
        const { data: oldComments } = await supabase
            .from("comments")
            .select("content, pos_x, pos_y, video_timestamp, user_id, is_internal")
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
        }));

        const { error } = await supabase.from("comments").insert(newComments);
        if (error) return { count: 0, error: error.message };

        revalidatePath(`/proofs/${proofId}`);
        return { count: newComments.length, error: null };
    } catch (err) {
        return { count: 0, error: "Failed to carry comments" };
    }
}
