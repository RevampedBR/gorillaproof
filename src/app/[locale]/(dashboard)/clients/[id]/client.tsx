"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createProject } from "@/lib/actions/projects";
import { Plus, ChevronRight, X, AlertCircle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

type Project = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    proofs: { id: string }[];
};

type Client = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    projects: Project[];
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
    active: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        ring: "ring-emerald-500/20",
        dot: "bg-emerald-500",
        label: "statusActive"
    },
    archived: {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        ring: "ring-zinc-500/20",
        dot: "bg-zinc-500",
        label: "statusArchived"
    },
    completed: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        ring: "ring-blue-500/20",
        dot: "bg-blue-500",
        label: "statusCompleted"
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

export default function ClientDetailClient({ client }: { client: Client }) {
    const t = useTranslations("dashboard");
    const tc = useTranslations("dashboard.clients");
    const tp = useTranslations("dashboard.projects");

    const [isCreating, setIsCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleCreate(formData: FormData) {
        formData.set("client_id", client.id);
        setFormError(null);
        startTransition(async () => {
            const result = await createProject(formData);
            if (result.error) {
                setFormError(result.error);
            } else {
                setIsCreating(false);
            }
        });
    }

    return (
        <div className="flex flex-col min-h-full pb-20">
            {/* Cinematic Hero Header */}
            <div className="relative pt-8 pb-12 overflow-hidden mb-10 border-b border-zinc-800/40">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-[500px] left-[50%] -translate-x-1/2 w-[1000px] h-[1000px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                        <Link href="/clients" className="hover:text-zinc-300 transition-colors">
                            {tc("title")}
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-zinc-300 font-medium">{client.name}</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
                                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400">
                                    {client.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter text-zinc-100">
                                    {client.name}
                                </h1>
                                {client.description && (
                                    <p className="text-zinc-500 text-sm max-w-xl font-light">
                                        {client.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0">
                            <button
                                onClick={() => setIsCreating(true)}
                                className="group relative inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white text-zinc-950 font-medium text-[14px] transition-all hover:bg-zinc-200 hover:scale-[0.98] active:scale-[0.95] shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]"
                            >
                                <Plus className="h-4 w-4" />
                                {tc("createProject")}
                                <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl group-hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full">
                {/* Create Project Modal */}
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-2xl border border-zinc-800/60 bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 pt-6 pb-5 border-b border-zinc-800/60">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">{tp("createTitle")}</h2>
                                    <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-sm text-zinc-500">{tp("createSubtitle")}</p>
                            </div>
                            <div className="p-6">
                                <form action={handleCreate} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{tp("name")}</label>
                                        <input
                                            name="name"
                                            type="text"
                                            placeholder={tp("namePlaceholder")}
                                            required
                                            className="w-full rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{tp("description")}</label>
                                        <textarea
                                            name="description"
                                            rows={3}
                                            placeholder={tp("descriptionPlaceholder")}
                                            className="w-full rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none transition-shadow"
                                        />
                                    </div>
                                    {formError && (
                                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 text-red-400 px-3 py-2 text-xs border border-red-500/20">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <p>{formError}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-3 justify-end pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsCreating(false)}
                                            className="text-zinc-400 hover:text-zinc-200 text-sm h-10 px-4 rounded-xl hover:bg-zinc-800/50"
                                        >
                                            {tp("cancel")}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-zinc-100 hover:bg-white text-zinc-950 text-sm h-10 px-6 rounded-xl font-medium"
                                        >
                                            {isPending ? "..." : tp("submit")}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                <div>
                    <h2 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        {tc("projectsTitle")}
                    </h2>

                    {client.projects?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 shadow-inner">
                                <LayoutGrid className="h-8 w-8 text-zinc-500" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-200 mb-2">{tc("noProjects")}</h3>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="mt-4 h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-colors shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                {tc("createProject")}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {client.projects.map((project) => {
                                const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                                return (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                                    >
                                        {/* Thumbnail Area */}
                                        <div className={`relative h-32 w-full bg-gradient-to-br ${getGradientForId(project.id)} p-5 flex flex-col justify-between overflow-hidden`}>
                                            <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
                                            {/* Noise Texture Overlay */}
                                            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

                                            {/* Status Badge */}
                                            <div className="relative z-10 flex justify-end w-full">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot} shadow-[0_0_8px_currentColor]`} />
                                                    {tp(status.label)}
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
                                                <div className="text-[11px] font-medium text-zinc-500 group-hover:text-amber-400 transition-colors">
                                                    {t("projects.lastUpdated")} {new Date(project.updated_at).toLocaleDateString(undefined, {
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
        </div>
    );
}
