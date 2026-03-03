import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { ClientDetailClient } from "./client";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: client } = await supabase
        .from("clients")
        .select(`
            id, name, description, contact_email, contact_phone, segment, logo_url, status, created_at, updated_at,
            projects (
                id, name, description, status, created_at, updated_at,
                proofs ( id, title, status, tags, updated_at )
            ),
            proofs!proofs_client_id_fkey (
                id, title, status, tags, updated_at, project_id
            )
        `)
        .eq("id", id)
        .single();

    if (!client) notFound();

    return <ClientDetailClient client={client} />;
}
