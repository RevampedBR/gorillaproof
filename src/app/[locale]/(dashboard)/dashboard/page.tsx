import { getClients } from "@/lib/actions/clients";
import { DashboardHomeClient } from "./client";

export default async function DashboardHomePage() {
    const { data: clients } = await getClients();

    return <DashboardHomeClient clients={clients} />;
}
