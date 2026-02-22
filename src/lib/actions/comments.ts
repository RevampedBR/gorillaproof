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
            user_id,
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
    parentCommentId?: string | null
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
        })
        .select(`
            id, content, pos_x, pos_y, video_timestamp,
            status, parent_comment_id, created_at,
            user_id,
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
