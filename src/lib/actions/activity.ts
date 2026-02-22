"use server";

import { createClient } from "@/utils/supabase/server";

export type ActivityAction =
    | "version_uploaded"
    | "comment_added"
    | "comment_resolved"
    | "comment_reopened"
    | "status_changed"
    | "deadline_set"
    | "deadline_removed"
    | "comments_carried";

interface LogActivityParams {
    proofId: string;
    action: ActivityAction;
    metadata?: Record<string, unknown>;
}

export async function logActivity({ proofId, action, metadata = {} }: LogActivityParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_log").insert({
        proof_id: proofId,
        user_id: user.id,
        action,
        metadata,
    });
}

export interface ActivityEntry {
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    user_id: string;
    users: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
}

export async function getActivityLog(proofId: string): Promise<{ data: ActivityEntry[]; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("activity_log")
        .select(`
            id, action, metadata, created_at, user_id,
            users ( id, full_name, avatar_url, email )
        `)
        .eq("proof_id", proofId)
        .order("created_at", { ascending: false })
        .limit(100);

    return {
        data: (data ?? []) as unknown as ActivityEntry[],
        error: error?.message ?? null,
    };
}
