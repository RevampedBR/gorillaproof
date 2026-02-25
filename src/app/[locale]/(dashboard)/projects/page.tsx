import { getProjects } from "@/lib/actions/projects";
import { getClients } from "@/lib/actions/clients";
import { ProjectsListClient } from "./client";

export default async function ProjectsPage() {
    const { data: projects } = await getProjects();
    const { data: clients } = await getClients();

    return <ProjectsListClient projects={projects} clients={clients || []} />;
}
