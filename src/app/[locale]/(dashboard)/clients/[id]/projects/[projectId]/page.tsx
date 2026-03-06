import { getProofs } from "@/lib/actions/proofs";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./client";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string; projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
    const { id: clientId, projectId } = await params;
    const supabase = await createClient();

    // Verify client exists
    const { data: client } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", clientId)
        .single();

    if (!client) notFound();

    // Fetch the project
    const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, description, status, created_at, updated_at, organization_id, client_id, access_mode")
        .eq("id", projectId)
        .eq("client_id", clientId)
        .single();

    if (error || !project) notFound();

    // Fetch proofs for this project
    const { data: proofs } = await getProofs(projectId);

    // Generate thumbnail URLs for image proofs
    for (const proof of proofs) {
        const latestVersion = (proof as any).versions?.[0];
        if (latestVersion?.file_url) {
            const fileType: string = latestVersion.file_type || "";
            if (fileType.startsWith("image")) {
                const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(latestVersion.file_url);
                (proof as any)._thumbnailUrl = urlData.publicUrl;
            }
        }
    }

    return <ProjectDetailClient project={project} proofs={proofs} clientName={client.name} clientId={clientId} />;
}
