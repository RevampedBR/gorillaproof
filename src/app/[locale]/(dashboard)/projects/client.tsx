"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
    proofs: { id: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    archived: { label: "Archived", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    completed: { label: "Completed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export function ProjectsListClient({ projects }: { projects: Project[] }) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.toLowerCase();
        return projects.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q))
        );
    }, [projects, search]);

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-100">Projects</h1>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                        {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
                    </p>
                </div>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Project
                </Link>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-5">
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
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-11 w-11 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-medium text-zinc-300">
                        {search ? "No projects match your search" : "No projects yet"}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-1">
                        {search
                            ? "Try a different search term."
                            : "Create your first project to start organizing proofs."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((project) => {
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
                                        Updated {new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
