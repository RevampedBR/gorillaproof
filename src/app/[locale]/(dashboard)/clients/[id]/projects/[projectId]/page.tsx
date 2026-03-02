import { getProofs } from "@/lib/actions/proofs";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./client";

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
        .select("id, name, description, status, created_at, updated_at, organization_id, client_id")
        .eq("id", projectId)
        .eq("client_id", clientId)
        .single();

    if (error || !project) notFound();

    // Fetch proofs for this project
    const { data: proofs } = await getProofs(projectId);

    return <ProjectDetailClient project={project} proofs={proofs} clientName={client.name} clientId={clientId} />;
}
