import { getProjects } from "@/lib/actions/projects";
import { getClients } from "@/lib/actions/clients";
import { getTranslations } from "next-intl/server";
import { DashboardHomeClient } from "./client";

export default async function DashboardHomePage() {
    const t = await getTranslations("dashboard.home");
    const { data: projects } = await getProjects();
    const { data: clients } = await getClients();

    const activeProjects = projects.filter((p: any) => p.status === "active");
    const totalProofs = projects.reduce(
        (acc: number, p: any) => acc + (p.proofs?.length || 0),
        0
    );

    const stats = {
        activeProjects: activeProjects.length,
        totalProofs,
        pendingComments: 0,
        approvedToday: 0,
    };

    return <DashboardHomeClient projects={projects} stats={stats} clients={clients || []} />;
}
