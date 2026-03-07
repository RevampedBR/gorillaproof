"use client";

import { useEffect, useState } from "react";
import { getDashboardData, type DashboardData } from "@/lib/actions/analytics";
import { generateDashboardCsv } from "@/lib/actions/export";
import { Link } from "@/i18n/navigation";
import { GorillaEmpty, BananaSpinner } from "@/components/ui/banana-elements";
import { Download } from "lucide-react";

/* ═══ CONSTANTS ═══ */

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
    draft: { label: "Rascunho", color: "text-zinc-400 bg-zinc-500/15", dot: "bg-zinc-400" },
    in_review: { label: "Revisão", color: "text-amber-400 bg-amber-500/15", dot: "bg-amber-400" },
    approved: { label: "Aprovada", color: "text-emerald-400 bg-emerald-500/15", dot: "bg-emerald-400" },
    rejected: { label: "Rejeitada", color: "text-red-400 bg-red-500/15", dot: "bg-red-400" },
    changes_requested: { label: "Ajustes", color: "text-sky-400 bg-sky-500/15", dot: "bg-sky-400" },
};

function formatRelative(iso: string | null): string {
    if (!iso) return "Nunca";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ═══ COMPONENT ═══ */

export function AnalyticsDashboard({ initialData }: { initialData?: DashboardData | null }) {
    const [data, setData] = useState<DashboardData | null>(initialData ?? null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const { csv, error } = await generateDashboardCsv();
            if (error || !csv) return;
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `gorillaproof_relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        // If we already have data from server-side props, skip client fetch
        if (initialData) return;

        getDashboardData()
            .then(({ data, error }) => {
                if (error) {
                    console.error("[AnalyticsDashboard] Server error:", error);
                    setError(error);
                }
                setData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("[AnalyticsDashboard] Fetch error:", err);
                setError(err?.message || "Erro desconhecido");
                setLoading(false);
            });
    }, [initialData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <BananaSpinner text="Carregando dados..." size={40} />
            </div>
        );
    }

    if (!data) {
        if (error) {
            return (
                <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-6 text-center">
                    <p className="text-[13px] text-red-400">{error}</p>
                </div>
            );
        }
        return null;
    }

    const { stats } = data;

    return (
        <div className="space-y-4">

            {/* ═══ ROW 1: QUICK STATS ═══ */}
            <div className="flex items-center justify-between mb-1">
                <span />
                <button
                    onClick={handleExportCsv}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                    <Download className="h-3.5 w-3.5" />
                    {exporting ? "Exportando..." : "Exportar CSV"}
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Provas Ativas" value={stats.totalActive} icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" accent="emerald" />
                <StatCard label="Aguardando Revisão" value={stats.awaitingReview} icon="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" accent="amber" />
                <StatCard label="Atrasadas" value={stats.lateCount} icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" accent={stats.lateCount > 0 ? "red" : "zinc"} />
                <StatCard label="Aprovação 1ª Versão" value={`${stats.firstVersionApprovalRate}%`} icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" accent="emerald" />
            </div>

            {/* ═══ ROW 2: ATTENTION + DEADLINES ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Precisam de Atenção ── */}
                <div className="rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Precisam de Atenção</p>
                        {data.attentionProofs.length > 0 && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{data.attentionProofs.length}</span>
                        )}
                    </div>
                    {data.attentionProofs.length === 0 ? (
                        <GorillaEmpty text="Tudo em dia!" sub="Nenhuma prova precisa de atenção." size={80} />
                    ) : (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto viewer-styled-scrollbar pr-1">
                            {data.attentionProofs.map((p) => (
                                <Link key={p.id} href={`/proofs/${p.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.03] transition-colors group">
                                    {/* Thumbnail */}
                                    <div className="h-12 w-12 rounded-lg bg-zinc-800 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                                        {p.thumbnailUrl ? (
                                            <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                                            </svg>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{p.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-zinc-500 truncate">{p.clientName}</span>
                                            {p.openComments > 0 && (
                                                <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{p.openComments} comentário{p.openComments > 1 ? "s" : ""}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Right badges */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {p.daysOverdue > 0 && (
                                            <span className="text-[9px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{p.daysOverdue}d atraso</span>
                                        )}
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CFG[p.status]?.color || "text-zinc-400 bg-zinc-500/15"}`}>
                                            {STATUS_CFG[p.status]?.label || p.status}
                                        </span>
                                        {p.lastViewedAt && (
                                            <span className="text-[9px] text-zinc-600 flex items-center gap-0.5">
                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                </svg>
                                                {formatRelative(p.lastViewedAt)}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Mini Calendario ── */}
                <div className="rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Proximos Deadlines</p>
                        <Link href="/calendar" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1">
                            Ver calendario
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                    {data.upcomingDeadlines.length === 0 ? (
                        <GorillaEmpty text="Agenda tranquila" sub="Nenhum prazo nos proximos 7 dias." size={80} />
                    ) : (
                        <MiniCalendar deadlines={data.upcomingDeadlines} />
                    )}
                </div>
            </div>

            {/* ═══ ROW 3: COMMENTS + ACTIVITY ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Comentários Recentes ── */}
                <div className="rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-4">Comentários Recentes</p>
                    {data.recentComments.length === 0 ? (
                        <GorillaEmpty text="Silêncio na selva" sub="Nenhum comentário ainda" size={80} />
                    ) : (
                        <div className="space-y-3">
                            {data.recentComments.map((c) => (
                                <div key={c.id} className="flex items-start gap-3">
                                    <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-400 ring-1 ring-zinc-700">
                                        {c.authorName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[12px] font-medium text-zinc-200 truncate">{c.authorName}</span>
                                            <span className="text-[10px] text-zinc-600">em</span>
                                            <span className="text-[11px] text-emerald-400/80 truncate">{c.proofTitle}</span>
                                            {c.status === "resolved" && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">Resolvido</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed truncate">{c.content}</p>
                                    </div>
                                    <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">{formatRelative(c.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Atividade Recente ── */}
                <div className="rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-4">Atividade Recente</p>
                    {data.recentActivity.length === 0 ? (
                        <GorillaEmpty text="Nenhum movimento" sub="Nenhuma atividade registrada" size={80} />
                    ) : (
                        <div className="space-y-3">
                            {data.recentActivity.map((a) => {
                                const cfg = STATUS_CFG[a.status] || STATUS_CFG.draft;
                                return (
                                    <div key={a.proofId} className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                                        <div className="min-w-0 flex-1 flex items-center gap-2">
                                            <span className="text-[12px] font-medium text-zinc-200 truncate">{a.proofTitle}</span>
                                            <span className="text-[10px] text-zinc-600 shrink-0">·</span>
                                            <span className="text-[11px] text-zinc-500 truncate">{a.clientName}</span>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.color} shrink-0`}>{cfg.label}</span>
                                        <span className="text-[10px] text-zinc-600 shrink-0">{formatRelative(a.updatedAt)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══ SUB-COMPONENTS ═══ */

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: string }) {
    const accentColors: Record<string, string> = {
        emerald: "text-emerald-400 bg-emerald-500/10",
        amber: "text-amber-400 bg-amber-500/10",
        red: "text-red-400 bg-red-500/10",
        zinc: "text-zinc-500 bg-zinc-800/50",
    };
    const colors = accentColors[accent] || accentColors.zinc;
    const [iconColor, iconBg] = colors.split(" ");

    return (
        <div className="rounded-xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-4 hover:bg-zinc-900/40 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <svg className={`h-4 w-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                </div>
                <div>
                    <p className="text-xl font-semibold text-white tracking-tight">{value}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="h-5 w-5 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            <p className="text-[11px] text-zinc-600">{text}</p>
        </div>
    );
}

function MiniCalendar({ deadlines }: { deadlines: { id: string; title: string; deadline: string; clientName: string; daysLeft: number; status: string }[] }) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const todayDate = now.getDate();

    const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

    // Map deadlines to day numbers
    const deadlinesByDay = new Map<number, typeof deadlines>();
    deadlines.forEach(d => {
        const dt = new Date(d.deadline);
        if (dt.getMonth() === month && dt.getFullYear() === year) {
            const day = dt.getDate();
            if (!deadlinesByDay.has(day)) deadlinesByDay.set(day, []);
            deadlinesByDay.get(day)!.push(d);
        }
    });

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) for (let i = 0; i < remaining; i++) cells.push(null);

    return (
        <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayNames.map((d, i) => (
                    <div key={i} className="text-center text-[9px] font-semibold text-zinc-600 uppercase">{d}</div>
                ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} className="h-8" />;
                    const isToday = day === todayDate;
                    const dayDeadlines = deadlinesByDay.get(day) || [];
                    return (
                        <div
                            key={i}
                            className={`h-8 rounded-md flex flex-col items-center justify-center relative ${isToday ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : ""
                                }`}
                        >
                            <span className={`text-[10px] font-medium ${isToday ? "text-emerald-400 font-bold" : day < todayDate ? "text-zinc-600" : "text-zinc-400"
                                }`}>
                                {day}
                            </span>
                            {dayDeadlines.length > 0 && (
                                <div className="flex gap-[2px] mt-[-1px]">
                                    {dayDeadlines.slice(0, 3).map((_, j) => (
                                        <span
                                            key={j}
                                            className={`w-1 h-1 rounded-full ${dayDeadlines[0]?.daysLeft <= 1 ? "bg-red-400" : dayDeadlines[0]?.daysLeft <= 3 ? "bg-amber-400" : "bg-emerald-400"
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Upcoming list */}
            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                {deadlines.slice(0, 3).map(d => (
                    <Link key={d.id} href={`/proofs/${d.id}`} className="flex items-center gap-2 py-1 group">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.daysLeft <= 1 ? "bg-red-400" : d.daysLeft <= 3 ? "bg-amber-400" : "bg-emerald-400"
                            }`} />
                        <span className="text-[11px] text-zinc-300 truncate flex-1 group-hover:text-white transition-colors">{d.title}</span>
                        <span className={`text-[9px] font-semibold shrink-0 ${d.daysLeft <= 1 ? "text-red-400" : d.daysLeft <= 3 ? "text-amber-400" : "text-zinc-500"
                            }`}>
                            {d.daysLeft === 0 ? "Hoje" : d.daysLeft === 1 ? "Amanha" : `${d.daysLeft}d`}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

