import { getClients } from "@/lib/actions/clients";
import { ClientsListClient } from "./client";

export default async function ClientsPage() {
    const { data: clients } = await getClients();
    return <ClientsListClient clients={clients || []} />;
}
