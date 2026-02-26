import { getClients } from "@/lib/actions/clients";
import ClientsPageClient from "./client";

export default async function ClientsPage() {
    const { data: clients, error } = await getClients();

    return <ClientsPageClient clients={clients} error={error} />;
}
