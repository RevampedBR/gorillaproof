"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { useTranslations } from "next-intl";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
    proofs: { id: string }[];
    clients: { id: string; name: string } | null;
}

interface Client {
    id: string;
    name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    archived: { label: "Archived", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    completed: { label: "Completed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export function ProjectsListClient({ projects, clients }: { projects: Project[], clients: Client[] }) {
    const t = useTranslations("dashboard.projects");
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.toLowerCase();
        return projects.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                (p.clients && p.clients.name.toLowerCase().includes(q))
        );
    }, [projects, search]);

    const grouped = useMemo(() => {
        const groups: Record<string, Project[]> = {};
        const clientNames: Record<string, string> = {};

        // Initialize groups
        groups["internal"] = [];
        clients.forEach(c => {
            groups[c.id] = [];
            clientNames[c.id] = c.name;
        });

        filtered.forEach(p => {
            if (p.clients) {
                if (!groups[p.clients.id]) {
                    groups[p.clients.id] = []; // Should exist if client list is up to date, but safety check
                    clientNames[p.clients.id] = p.clients.name;
                }
                groups[p.clients.id].push(p);
            } else {
                groups["internal"].push(p);
            }
        });

        return { groups, clientNames };
    }, [filtered, clients]);

    const hasProjects = filtered.length > 0;

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-100">{t("createTitle")}</h1>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                        {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
                    </p>
                </div>

                <CreateProjectDialog clients={clients}>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t("createTitle")}
                    </button>
                </CreateProjectDialog>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-8">
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full h-8 rounded-lg border border-zinc-800 bg-zinc-900/50 pl-9 pr-3 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Results */}
            {!hasProjects ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-11 w-11 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-medium text-zinc-300">
                        {search ? "No projects match your search" : t("noProofs")}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-1">
                        {search
                            ? "Try a different search term."
                            : t("createSubtitle")}
                    </p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Render groups */}
                    {Object.entries(grouped.groups).map(([clientId, groupProjects]) => {
                        if (groupProjects.length === 0) return null;
                        const clientName = clientId === "internal" ? "Internal Projects" : grouped.clientNames[clientId];

                        return (
                            <div key={clientId}>
                                <h2 className="text-[13px] font-semibold text-zinc-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    {clientId === "internal" ? (
                                         <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                         </svg>
                                    ) : (
                                         <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    )}
                                    {clientName}
                                    <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] ml-1">{groupProjects.length}</span>
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {groupProjects.map((project) => {
                                        const config = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                                        const proofCount = project.proofs?.length || 0;

                                        return (
                                            <Link
                                                key={project.id}
                                                href={`/projects/${project.id}`}
                                                className="group rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
                                                        <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                        </svg>
                                                    </div>
                                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${config.color}`}>
                                                        {config.label}
                                                    </Badge>
                                                </div>

                                                <h3 className="text-[14px] font-semibold text-zinc-200 group-hover:text-white mb-1 truncate">
                                                    {project.name}
                                                </h3>

                                                {project.description && (
                                                    <p className="text-[12px] text-zinc-500 line-clamp-2 mb-3">
                                                        {project.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/40">
                                                    <span className="text-[11px] text-zinc-500">
                                                        {proofCount} proof{proofCount !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="text-[11px] text-zinc-600">
                                                        {new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
