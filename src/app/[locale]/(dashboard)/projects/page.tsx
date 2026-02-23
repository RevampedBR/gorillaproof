import { getProjects } from "@/lib/actions/projects";
import { ProjectsListClient } from "./client";

export default async function ProjectsPage() {
    const { data: projects } = await getProjects();

    return <ProjectsListClient projects={projects} />;
}
