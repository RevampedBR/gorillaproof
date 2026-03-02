import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Public API: Get comments for a version (used by guest mode)
 * GET /api/proofs/comments?versionId=<uuid>
 */
export async function GET(request: NextRequest) {
    const versionId = request.nextUrl.searchParams.get("versionId");

    if (!versionId) {
        return NextResponse.json({ error: "Missing versionId" }, { status: 400 });
    }

    try {

        const { data, error } = await supabaseAdmin
            .from("comments")
            .select(`
                id, content, pos_x, pos_y, video_timestamp,
                status, parent_comment_id, created_at, updated_at,
                user_id, guest_reviewer_id, attachment_url, is_internal,
                users ( id, full_name, avatar_url, email ),
                guest_reviewers ( id, display_name, email )
            `)
            .eq("version_id", versionId)
            .eq("is_internal", false)
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data ?? []);
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
