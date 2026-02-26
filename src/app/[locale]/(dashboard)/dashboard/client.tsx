"use client";

import { useTranslations } from "next-intl";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Link } from "@/i18n/navigation";
import { useMemo } from "react";

interface DashboardHomeClientProps {
    projects: any[];
    stats: {
        activeProjects: number;
        totalProofs: number;
        pendingComments: number;
        approvedToday: number;
    };
}

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

// Funções determinísticas para gerar gradientes estéticos baseados no ID do projeto
const THUMBNAIL_GRADIENTS = [
    "from-indigo-600 via-purple-600 to-fuchsia-600",
    "from-blue-600 via-sky-500 to-indigo-600",
    "from-rose-500 via-orange-500 to-amber-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-violet-600 via-fuchsia-600 to-rose-500",
    "from-slate-800 via-zinc-800 to-neutral-900"
];

function getGradientForId(id: string) {
    if (!id) return THUMBNAIL_GRADIENTS[0];
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return THUMBNAIL_GRADIENTS[sum % THUMBNAIL_GRADIENTS.length];
}

export function DashboardHomeClient({ projects, stats }: DashboardHomeClientProps) {
    const t = useTranslations("dashboard.home");
    const tp = useTranslations("dashboard.projects");

    const activeProjects = projects.filter((p) => p.status === "active");

    const statCards = [
        { label: t("activeProjects"), value: stats.activeProjects, color: "text-emerald-400" },
        { label: t("urgentProofs"), value: stats.totalProofs, color: "text-amber-400" },
        { label: t("pendingComments"), value: stats.pendingComments, color: "text-sky-400" },
        { label: t("approvedToday"), value: stats.approvedToday, color: "text-indigo-400" },
    ];

    const today = useMemo(() => {
        return new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }, []);

    return (
        <div className="flex flex-col min-h-full pb-20">
            {/* Cinematic Hero Section */}
            <div className="relative pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden mb-12 border-b border-zinc-800/40">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-[500px] left-[50%] -translate-x-1/2 w-[1000px] h-[1000px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">
                                {today}
                            </p>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 pb-2">
                                {t("welcome")}
                            </h1>
                            <p className="text-zinc-500 text-lg md:text-xl max-w-2xl font-light">
                                {t("subtitle")}
                            </p>
                        </div>
                        <div className="shrink-0">
                            <CreateProjectDialog>
                                <button className="group relative inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-zinc-950 font-medium text-[15px] transition-all hover:bg-zinc-200 hover:scale-[0.98] active:scale-[0.95] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    {tp("createTitle")}
                                    <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl group-hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100" />
                                </button>
                            </CreateProjectDialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full space-y-16">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/30 rounded-2xl overflow-hidden border border-zinc-800/60 shadow-lg">
                    {statCards.map((stat, i) => (
                        <div key={i} className="bg-zinc-950/80 p-6 md:p-8 hover:bg-zinc-900 transition-colors group">
                            <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-widest mb-3">
                                {stat.label}
                            </p>
                            <p className={`text-4xl md:text-5xl font-light tracking-tighter ${stat.color} drop-shadow-sm`}>
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Cinematic Project Grid */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
                            {t("activeProjects")}
                        </h2>
                        <Link href="/projects" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 group">
                            View all
                            <svg className="h-4 w-4 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>

                    {activeProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center px-4">
                            <div className="h-16 w-16 mb-6 rounded-2xl bg-zinc-800 flex items-center justify-center shadow-inner">
                                <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-zinc-200 mb-2">{t("noProjects")}</h3>
                            <p className="text-sm text-zinc-500 max-w-sm mb-6">{t("subtitle")}</p>
                            <CreateProjectDialog>
                                <button className="h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-colors shadow-lg shadow-indigo-500/20">
                                    + {tp("createTitle")}
                                </button>
                            </CreateProjectDialog>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeProjects.map((project: any) => {
                                const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                                const clientName = project.client?.name;

                                return (
                                    <Link key={project.id} href={`/projects/${project.id}`} className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">

                                        {/* Thumbnail Area */}
                                        <div className={`relative h-40 w-full bg-gradient-to-br ${getGradientForId(project.id)} p-5 flex flex-col justify-between overflow-hidden`}>
                                            <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
                                            {/* Noise Texture Overlay */}
                                            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

                                            {/* Client Badge */}
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
                                                    {t("lastUpdated")} {new Date(project.updated_at).toLocaleDateString(undefined, {
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
