import { getClients } from "@/lib/actions/clients";
import { getDashboardData } from "@/lib/actions/analytics";
import { DashboardHomeClient } from "./client";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
    const [{ data: clients }, { data: dashboardData }] = await Promise.all([
        getClients(),
        getDashboardData(),
    ]);

    return <DashboardHomeClient clients={clients} dashboardData={dashboardData} />;
}
