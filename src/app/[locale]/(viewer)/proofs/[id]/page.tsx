import { createClient } from "@/utils/supabase/server";
import { getVersions } from "@/lib/actions/versions";
import { getComments } from "@/lib/actions/comments";
import { getOrgMembers } from "@/lib/actions/proofs";
import { notFound } from "next/navigation";
import { ProofViewer } from "./viewer";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProofViewerPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    // Fetch the proof with its project info
    const { data: proof, error } = await supabase
        .from("proofs")
        .select(`
            id, title, status, created_at, updated_at, deadline,
            project_id,
            projects ( id, name, organization_id )
        `)
        .eq("id", id)
        .single();

    if (error || !proof) notFound();

    // Fetch all versions
    const { data: versions } = await getVersions(id);

    // Fetch comments for the latest version
    const latestVersion = versions[0];
    const initialComments = latestVersion
        ? (await getComments(latestVersion.id)).data
        : [];

    // Fetch org members for @mentions
    const orgId = (proof as any).projects?.organization_id || "";
    const { data: orgMembers } = orgId ? await getOrgMembers(orgId) : { data: [] };

    return (
        <ProofViewer
            proof={proof}
            versions={versions}
            initialComments={initialComments}
            projectName={(proof as any).projects?.name || ""}
            orgId={orgId}
            currentUserId={user.id}
            orgMembers={orgMembers}
        />
    );
}
