import { getPortalDashboard } from "@/lib/actions/client-portal-data";
import PortalDashboardClient from "./client";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
    const { data: dashboardData } = await getPortalDashboard();

    return <PortalDashboardClient data={dashboardData} />;
}
