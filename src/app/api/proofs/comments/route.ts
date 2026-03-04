import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Get comments for a version.
 * - Authenticated users: see all comments (including internal)
 * - Guests: see only non-internal comments
 * GET /api/proofs/comments?versionId=<uuid>
 */
export async function GET(request: NextRequest) {
    const versionId = request.nextUrl.searchParams.get("versionId");

    if (!versionId) {
        return NextResponse.json({ error: "Missing versionId" }, { status: 400 });
    }

    try {
        // Check if the requester is authenticated
        let isAuthenticated = false;
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            isAuthenticated = !!user;
        } catch {
            isAuthenticated = false;
        }

        let query = supabaseAdmin
            .from("comments")
            .select(`
                id, content, pos_x, pos_y, video_timestamp,
                status, parent_comment_id, created_at, updated_at,
                user_id, guest_reviewer_id, attachment_url, is_internal,
                annotation_shape,
                users ( id, full_name, avatar_url, email ),
                guest_reviewers ( id, display_name, email )
            `)
            .eq("version_id", versionId)
            .order("created_at", { ascending: true });

        // Guests only see non-internal comments
        if (!isAuthenticated) {
            query = query.eq("is_internal", false);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data ?? []);
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
