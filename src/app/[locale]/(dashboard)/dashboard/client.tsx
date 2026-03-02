"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

/* ═══ TYPES ═══ */
interface Proof {
    id: string;
    title: string;
    status: string;
    tags: string[] | null;
    updated_at: string;
    thumbnail_url?: string | null;
    deadline?: string | null;
}

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    proofs: Proof[];
}

interface ClientData {
    id: string;
    name: string;
    description: string | null;
    logo_url?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    projects: Project[];
}

/* ═══ STATUS CONFIG ═══ */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    draft: { label: "Rascunho", bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-400" },
    in_review: { label: "Em Revisão", bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
    approved: { label: "Aprovada", bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
    rejected: { label: "Rejeitada", bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
    changes_requested: { label: "Ajustes", bg: "bg-sky-500/15", text: "text-sky-400", dot: "bg-sky-400" },
};

/* ═══ FILE TYPE ICONS ═══ */
function FileTypeIcon({ type, className }: { type: string | null; className?: string }) {
    const t = type || "image";
    if (t === "video") return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
    if (t === "pdf") return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
    );
    // Default: image
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
    );
}

/* ═══ DETECT FILE TYPE FROM TAGS/TITLE ═══ */
function detectFileType(proof: Proof): string {
    const tags = (proof.tags || []).map(t => t.toLowerCase());
    const title = proof.title.toLowerCase();
    if (tags.includes("video") || title.includes("video") || title.includes("teaser")) return "video";
    if (tags.includes("pdf") || title.includes("pdf") || title.includes("catalog")) return "pdf";
    return "image";
}

function getTypeGradient(type: string): string {
    if (type === "video") return "from-rose-500/20 to-orange-500/20 border-rose-500/20";
    if (type === "pdf") return "from-sky-500/20 to-blue-500/20 border-sky-500/20";
    return "from-emerald-500/20 to-teal-500/20 border-emerald-500/20";
}

function getTypeIconColor(type: string): string {
    if (type === "video") return "text-rose-400";
    if (type === "pdf") return "text-sky-400";
    return "text-emerald-400";
}

/* ═══ MAIN COMPONENT ═══ */
export function DashboardHomeClient({ clients }: { clients: ClientData[] }) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        // Auto-expand the first client if it has projects, or explicitly open all
        return new Set(clients.map(c => c.id));
    });

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Stats
    const totalClients = clients.filter(c => c.status === "active").length;

    // Calculate total projects across all clients
    const totalProjects = clients.reduce((acc, c) => acc + (c.projects?.length || 0), 0);

    // Calculate total proofs across all projects in all clients
    const totalProofs = clients.reduce(
        (acc, c) => acc + (c.projects?.reduce((pAcc, p) => pAcc + (p.proofs?.length || 0), 0) || 0), 0
    );

    // Calculate status distribution
    const statusCounts = clients.reduce<Record<string, number>>((acc, c) => {
        c.projects?.forEach(p => p.proofs?.forEach(pr => {
            acc[pr.status] = (acc[pr.status] || 0) + 1;
        }));
        return acc;
    }, {});

    const approvedCount = statusCounts["approved"] || 0;
    const approvalRate = totalProofs > 0 ? Math.round((approvedCount / totalProofs) * 100) : 0;
    const inReviewCount = statusCounts["in_review"] || 0;
    const changesCount = statusCounts["changes_requested"] || 0;

    const today = useMemo(() => {
        return new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }, []);

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto">

            {/* ═══ HEADER ═══ */}
            <div className="flex items-end justify-between mb-8 mt-2">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-white flex items-center gap-2">
                        Boa tarde, Milo
                    </h1>
                    <p className="text-[13px] text-zinc-500 mt-1 flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {new Date().toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>
                <CreateProjectDialog>
                    <button className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[13px] font-semibold text-black hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Novo Projeto
                    </button>
                </CreateProjectDialog>
            </div>

            {/* ═══ BIG BENTO ANALYTICS ═══ */}
            <div className="mb-8">
                <AnalyticsDashboard />
            </div>

            {/* ═══ STATUS BAR ═══ */}
            {totalProofs > 0 && (
                <div className="mb-6 pb-6 border-b border-zinc-800/50">
                    <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden bg-zinc-800/40">
                        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                            const count = statusCounts[status] || 0;
                            if (count === 0) return null;
                            const width = (count / totalProofs) * 100;
                            return <div key={status} className={`h-full ${cfg.dot} transition-all duration-500`} style={{ width: `${width}%` }} title={`${cfg.label}: ${count}`} />;
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
                        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                            const count = statusCounts[status] || 0;
                            if (count === 0) return null;
                            return (
                                <div key={status} className="flex items-center gap-1.5">
                                    <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                    <span className="text-[10px] text-zinc-500">{cfg.label} ({count})</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ CLIENT LIST (ACCORDION) ═══ */}
            {clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl">
                    <div className="h-14 w-14 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                        <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                    </div>
                    <h3 className="text-[15px] font-semibold text-zinc-200">Nenhum cliente ativo</h3>
                    <p className="text-[12px] text-zinc-500 mt-1 max-w-xs">
                        Comece criando seu primeiro projeto para visualizar o progresso aqui.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-[14px] font-semibold text-zinc-200 tracking-tight">Atividades em Andamento</h2>
                    </div>
                    {clients.map(client => {
                        const isExpanded = expandedIds.has(client.id);
                        const projectCount = client.projects?.length || 0;
                        const clientProofCount = client.projects?.reduce((acc, p) => acc + (p.proofs?.length || 0), 0) || 0;

                        return (
                            <div key={client.id} className="rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-xl overflow-hidden transition-all hover:bg-zinc-900/40 group/client">

                                {/* ── Client Header Row ── */}
                                <button
                                    onClick={() => toggleExpand(client.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="h-10 w-10 border border-white/5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 group-hover/client:bg-zinc-800 transition-all overflow-hidden relative">
                                            {client.logo_url ? (
                                                <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-[13px] font-semibold text-zinc-300">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-semibold tracking-tight text-white truncate transition-colors">
                                                {client.name}
                                            </p>
                                            <p className="text-[12px] text-zinc-500 mt-0.5 font-medium tracking-wide">
                                                {projectCount} PROJETO{projectCount !== 1 ? "S" : ""} <span className="mx-1.5 opacity-40">·</span> {clientProofCount} PROVA{clientProofCount !== 1 ? "S" : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {/* Chevron */}
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? "bg-white/5 text-white" : "text-zinc-500 group-hover/client:bg-white/5 group-hover/client:text-zinc-300"}`}>
                                            <svg
                                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>

                                {/* ── Expanded: Projects Grid ── */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 bg-black/20 px-5 py-5">
                                        {projectCount === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-900/40 rounded-xl border border-white/5 border-dashed">
                                                <p className="text-[12px] text-zinc-500">Nenhum projeto neste cliente.</p>
                                                <CreateProjectDialog clientId={client.id}>
                                                    <button className="mt-3 px-4 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold hover:bg-zinc-200 transition-colors cursor-pointer">
                                                        Criar Projeto
                                                    </button>
                                                </CreateProjectDialog>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {client.projects.map(project => {
                                                    const proofsCountForProject = project.proofs?.length || 0;

                                                    // Data logic
                                                    const sortedProofs = [...(project.proofs || [])].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                                                    const latestProof = sortedProofs[0];
                                                    const thumbnailUrl = latestProof?.thumbnail_url || null;
                                                    const lastUpdated = latestProof?.updated_at || project.updated_at;

                                                    const activeDeadlines = (project.proofs || [])
                                                        .filter(p => p.deadline && !["approved", "rejected", "draft"].includes(p.status))
                                                        .map(p => new Date(p.deadline as string))
                                                        .sort((a, b) => a.getTime() - b.getTime());
                                                    const nextDeadline = activeDeadlines[0];

                                                    return (
                                                        <Link
                                                            key={project.id}
                                                            href={`/clients/${client.id}/projects/${project.id}`}
                                                            className="group/card rounded-xl border border-white/5 bg-zinc-900/50 hover:border-zinc-700/60 hover:bg-zinc-800/60 transition-all flex flex-col justify-between overflow-hidden relative min-h-[140px]"
                                                        >
                                                            {/* Background Thumbnail if available */}
                                                            {thumbnailUrl && (
                                                                <>
                                                                    <div className="absolute inset-0 z-0">
                                                                        <img src={thumbnailUrl} alt={project.name} className="w-full h-full object-cover opacity-20 filter blur-sm group-hover/card:scale-105 group-hover/card:opacity-30 transition-all duration-700 ease-out" />
                                                                    </div>
                                                                    <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-transparent" />
                                                                </>
                                                            )}

                                                            <div className="relative z-10 p-5 flex flex-col h-full justify-between">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="truncate pr-2">
                                                                        <p className="text-[15px] font-semibold text-zinc-100 group-hover/card:text-white truncate transition-colors drop-shadow-md">
                                                                            {project.name}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                            <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase drop-shadow-sm">
                                                                                {proofsCountForProject} prova{proofsCountForProject !== 1 ? "s" : ""}
                                                                            </p>
                                                                            <span className="text-[11px] text-zinc-600 font-medium">•</span>
                                                                            <p className="text-[10px] font-medium text-zinc-500 tracking-wide drop-shadow-sm">
                                                                                Atualizado {new Date(lastUpdated).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-7 w-7 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shrink-0">
                                                                        <svg className="h-3.5 w-3.5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                                        </svg>
                                                                    </div>
                                                                </div>

                                                                {/* Bottom Row: Status Badges and Deadlines */}
                                                                <div className="flex items-end justify-between gap-4 mt-8">
                                                                    {proofsCountForProject > 0 ? (
                                                                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                                                            {Object.entries(
                                                                                (project.proofs || []).reduce<Record<string, number>>((acc, p) => {
                                                                                    acc[p.status] = (acc[p.status] || 0) + 1;
                                                                                    return acc;
                                                                                }, {})
                                                                            ).map(([status, count]) => {
                                                                                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
                                                                                return (
                                                                                    <span key={status} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border border-current/10 shadow-sm backdrop-blur-md`}>
                                                                                        {count} {cfg.label}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex-1" />
                                                                    )}

                                                                    {nextDeadline && (
                                                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-rose-400/90 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 backdrop-blur-md shrink-0 mb-0.5">
                                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            {nextDeadline.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}

                                                {/* Add new project card */}
                                                <CreateProjectDialog clientId={client.id}>
                                                    <button className="h-full min-h-[140px] w-full rounded-xl border border-dashed border-white/10 bg-zinc-900/20 flex flex-col items-center justify-center hover:border-white/20 hover:bg-zinc-800/40 transition-all group/add cursor-pointer">
                                                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover/add:bg-white/10 transition-colors">
                                                            <svg className="h-5 w-5 text-zinc-400 group-hover/add:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[12px] font-semibold tracking-wide uppercase text-zinc-500 group-hover/add:text-zinc-300 mt-3 transition-colors">
                                                            Novo Projeto
                                                        </span>
                                                    </button>
                                                </CreateProjectDialog>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
