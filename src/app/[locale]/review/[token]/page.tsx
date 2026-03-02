import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { validateShareToken } from "@/lib/actions/guests";
import { ReviewPageClient } from "./review-client";

interface Props {
    params: Promise<{ token: string }>;
}

export default async function GuestReviewPage({ params }: Props) {
    const { token } = await params;

    // Validate the share token server-side
    const validation = await validateShareToken(token);

    if (!validation.valid || !validation.proof) {
        notFound();
    }

    const proof = validation.proof;
    const supabase = await createClient();

    // Fetch versions (no auth required — using service-level query)
    const { data: versions } = await supabase
        .from("versions")
        .select("id, version_number, file_url, file_type, uploaded_by, created_at")
        .eq("proof_id", proof.id)
        .order("version_number", { ascending: false });

    // Fetch comments for the latest version
    const latestVersion = versions?.[0];
    let initialComments: any[] = [];
    if (latestVersion) {
        const { data: comments } = await supabase
            .from("comments")
            .select(`
                id, content, pos_x, pos_y, video_timestamp,
                status, parent_comment_id, created_at, updated_at,
                user_id, guest_reviewer_id, attachment_url, is_internal,
                users ( id, full_name, avatar_url, email ),
                guest_reviewers ( id, display_name, email )
            `)
            .eq("version_id", latestVersion.id)
            .eq("is_internal", false)
            .order("created_at", { ascending: true });

        initialComments = comments ?? [];
    }

    return (
        <ReviewPageClient
            proof={proof}
            versions={versions ?? []}
            initialComments={initialComments}
            token={token}
            projectName={proof.projects?.name || ""}
        />
    );
}
