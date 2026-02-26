import { getClientById } from "@/lib/actions/clients";
import ClientDetailClient from "./client";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id } = await params;
    const { data: client, error } = await getClientById(id);

    if (!client || error) notFound();

    return <ClientDetailClient client={client} />;
}
