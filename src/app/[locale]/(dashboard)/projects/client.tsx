"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Plus, LayoutGrid, Search } from "lucide-react";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
    proofs: { id: string }[];
    client?: { id: string; name: string } | { id: string; name: string }[] | any;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
    active: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        ring: "ring-emerald-500/20",
        dot: "bg-emerald-500",
        label: "Active"
    },
    archived: {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        ring: "ring-zinc-500/20",
        dot: "bg-zinc-500",
        label: "Archived"
    },
    completed: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        ring: "ring-blue-500/20",
        dot: "bg-blue-500",
        label: "Completed"
    },
};

const PROJECT_GRADIENTS = [
    "from-indigo-600 via-purple-600 to-fuchsia-600",
    "from-blue-600 via-sky-500 to-indigo-600",
    "from-rose-500 via-orange-500 to-amber-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-violet-600 via-fuchsia-600 to-rose-500",
];

function getGradientForId(id: string) {
    if (!id) return PROJECT_GRADIENTS[0];
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PROJECT_GRADIENTS[sum % PROJECT_GRADIENTS.length];
}

export function ProjectsListClient({ projects }: { projects: Project[] }) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.toLowerCase();
        return projects.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                (p.client?.name && p.client.name.toLowerCase().includes(q))
        );
    }, [projects, search]);

    return (
        <div className="flex flex-col min-h-full pb-20">
            {/* Cinematic Hero Header */}
            <div className="relative pt-10 pb-12 overflow-hidden mb-10 border-b border-zinc-800/40">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-[500px] left-[50%] -translate-x-1/2 w-[1000px] h-[1000px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
                                Projects
                            </h1>
                            <p className="text-zinc-500 text-base max-w-xl font-light">
                                {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
                            </p>
                        </div>
                        <div className="shrink-0">
                            <Link
                                href="/dashboard"
                                className="group relative inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white text-zinc-950 font-medium text-[14px] transition-all hover:bg-zinc-200 hover:scale-[0.98] active:scale-[0.95] shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]"
                            >
                                <Plus className="h-4 w-4" />
                                New Project
                                <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl group-hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full space-y-8">
                {/* Search Bar */}
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects by name, description or client..."
                        className="w-full h-11 rounded-xl border border-zinc-800/60 bg-zinc-900/50 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm"
                    />
                </div>

                {/* Cinematic Project Grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 shadow-inner">
                            <LayoutGrid className="h-8 w-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-200 mb-2">
                            {search ? "No projects match your search" : "No projects yet"}
                        </h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-6">
                            {search ? "Try a different search term or clear the filter." : "Create your first project from the Dashboard."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((project) => {
                            const config = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                            const clientName = project.client?.name;

                            return (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                                >
                                    {/* Thumbnail Cover Area */}
                                    <div className={`relative h-40 w-full bg-gradient-to-br ${getGradientForId(project.id)} p-5 flex flex-col justify-between overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
                                        {/* Noise Texture Overlay */}
                                        <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

                                        {/* Client Badge (flutuando) */}
                                        {clientName ? (
                                            <div className="relative z-10 flex items-center gap-2 max-w-full">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 backdrop-blur-md border border-white/20 shrink-0">
                                                    <span className="text-[12px] font-bold text-white shadow-sm">
                                                        {clientName.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-medium text-white/90 truncate drop-shadow-sm bg-black/20 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                                                    {clientName}
                                                </span>
                                            </div>
                                        ) : (
                                            <div /> // Spacer
                                        )}

                                        {/* Status Badge */}
                                        <div className="relative z-10 flex justify-end">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${config.dot} shadow-[0_0_8px_currentColor]`} />
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="flex flex-col p-5 grow">
                                        <div className="mb-4 grow">
                                            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1 mb-1.5">
                                                {project.name}
                                            </h3>
                                            {project.description ? (
                                                <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                                                    {project.description}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-zinc-600 italic">No description</p>
                                            )}
                                        </div>

                                        {/* Footer area */}
                                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60 mt-auto">
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    {/* Mock proof avatars/icons */}
                                                    {Array.from({ length: Math.min(project.proofs?.length || 0, 3) }).map((_, i) => (
                                                        <div key={i} className="h-7 w-7 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center relative z-10">
                                                            <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                            </svg>
                                                        </div>
                                                    ))}
                                                    {(project.proofs?.length || 0) === 0 && (
                                                        <span className="text-xs text-zinc-600">No proofs yet</span>
                                                    )}
                                                </div>
                                                {(project.proofs?.length || 0) > 3 && (
                                                    <span className="text-[11px] font-medium text-zinc-500">
                                                        +{project.proofs.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-medium text-zinc-500 group-hover:text-blue-400 transition-colors">
                                                Updated {new Date(project.updated_at).toLocaleDateString(undefined, {
                                                    day: "2-digit",
                                                    month: "short"
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
