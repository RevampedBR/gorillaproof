import { createClient } from "@/utils/supabase/server";
import { getVersions } from "@/lib/actions/versions";
import { notFound } from "next/navigation";
import { ProofViewer } from "./viewer";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProofViewerPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the proof with its project info
    const { data: proof, error } = await supabase
        .from("proofs")
        .select(`
            id, title, status, created_at, updated_at,
            project_id,
            projects ( id, name, organization_id )
        `)
        .eq("id", id)
        .single();

    if (error || !proof) notFound();

    // Fetch all versions
    const { data: versions } = await getVersions(id);

    return (
        <ProofViewer
            proof={proof}
            versions={versions}
            projectName={(proof as any).projects?.name || ""}
            orgId={(proof as any).projects?.organization_id || ""}
        />
    );
}
