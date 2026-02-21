import { getProofs } from "@/lib/actions/proofs";
import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./client";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const t = await getTranslations("dashboard.projects");

    // Fetch the project
    const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, description, status, created_at, updated_at, organization_id")
        .eq("id", id)
        .single();

    if (error || !project) {
        notFound();
    }

    // Fetch proofs for this project
    const { data: proofs } = await getProofs(id);

    return <ProjectDetailClient project={project} proofs={proofs} />;
}
