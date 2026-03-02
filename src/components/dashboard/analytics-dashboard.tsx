"use client";

import { useEffect, useState } from "react";
import { getAnalytics, type ProofAnalytics } from "@/lib/actions/analytics";

export function AnalyticsDashboard() {
    const [data, setData] = useState<ProofAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAnalytics().then(({ data }) => {
            setData(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 animate-pulse">
                <div className="md:col-span-2 md:row-span-2 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 min-h-[300px]" />
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 h-[142px]" />
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 h-[142px]" />
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 h-[142px]" />
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 h-[142px]" />
            </div>
        );
    }

    if (!data) return null;

    const weekTrend = data.proofsThisWeek - data.proofsLastWeek;
    const isPositiveTrend = weekTrend > 0;


    return (
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 auto-rows-min">

            {/* ── BENTO 1: Taxa de Conclusão & Status Geral (Large Card) ── */}
            <div className="md:col-span-2 md:row-span-2 block relative overflow-hidden rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-6 group transition-all hover:bg-zinc-900/40">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </div>

                <div className="flex flex-col h-full justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Eficiência</p>
                        <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 flex items-baseline gap-2">
                            {data.completionRate}%
                            <span className="text-[14px] font-normal text-zinc-500 tracking-normal">Taxa de Conclusão</span>
                        </h2>
                    </div>

                    <div className="mt-8 flex items-center justify-center relative">
                        {/* Circular Progress (Minimalist) */}
                        <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#emeraldGrad)" strokeWidth="1.5" strokeDasharray={`${data.completionRate}, 100`} strokeLinecap="round" className="animate-[spin_1.5s_ease-out_forwards]" />
                            <defs>
                                <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#34d399" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 mb-0.5">Pendentes</span>
                            <span className="text-2xl font-medium text-amber-400/90">{data.inReviewCount + data.changesRequestedCount}</span>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div>
                            <p className="text-[10px] text-zinc-500 mb-1">Total Entregues</p>
                            <p className="text-lg font-medium text-zinc-200">{data.completedCount} <span className="text-[11px] text-zinc-600">/ {data.totalProofs}</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 mb-1">Aprovação Direta</p>
                            <p className="text-lg font-medium text-emerald-400/90">{data.approvedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BENTO 2: Volume / Sparkline (Top Right Wide) ── */}
            <div className="md:col-span-2 block relative overflow-hidden rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Volume de Provas</p>
                        <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">
                            {data.proofsThisWeek}
                            <span className="text-[13px] font-normal text-zinc-500 ml-2">esta semana</span>
                        </h3>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${isPositiveTrend ? "bg-emerald-500/10 text-emerald-400" : weekTrend < 0 ? "bg-red-500/10 text-red-400" : "bg-zinc-800/50 text-zinc-500"}`}>
                        {weekTrend !== 0 && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={isPositiveTrend ? "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" : "M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"} />
                            </svg>
                        )}
                        {weekTrend === 0 ? "= sem variação" : `${Math.abs(weekTrend)} vs ant.`}
                    </div>
                </div>

                {/* SVG Sparkline com dados reais */}
                {(() => {
                    const vals = data.dailyVolume;
                    const maxVal = Math.max(...vals, 1); // evita divisão por zero
                    const isEmpty = vals.every(v => v === 0);
                    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
                    // Calcular dias da semana reais (hoje = último)
                    const today = new Date().getDay(); // 0=Dom, 1=Seg...
                    const dayLabels = Array.from({ length: 7 }, (_, i) => {
                        const dayIdx = (today - 6 + i + 7) % 7;
                        return days[dayIdx === 0 ? 6 : dayIdx - 1];
                    });

                    const W = 100, H = 60;
                    const padX = 0, padY = 8;
                    const points = vals.map((v, i) => {
                        const x = padX + (i / (vals.length - 1)) * (W - padX * 2);
                        const y = isEmpty ? H / 2 : padY + (1 - v / maxVal) * (H - padY * 2);
                        return `${x},${y}`;
                    });
                    const pathD = `M ${points.join(" L ")}`;
                    // Area fill path
                    const areaD = `M ${points[0]} L ${points.join(" L ")} L ${W},${H} L 0,${H} Z`;

                    return (
                        <div>
                            <div className="h-16 w-full relative">
                                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                        <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor={isEmpty ? "#52525b" : "#3b82f6"} />
                                            <stop offset="100%" stopColor={isEmpty ? "#52525b" : "#8b5cf6"} />
                                        </linearGradient>
                                        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={isEmpty ? "#52525b" : "#6366f1"} stopOpacity="0.18" />
                                            <stop offset="100%" stopColor={isEmpty ? "#52525b" : "#6366f1"} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {!isEmpty && <path d={areaD} fill="url(#areaGrad)" />}
                                    <path d={pathD} fill="none" stroke="url(#lineGrad2)" strokeWidth={isEmpty ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round" filter={isEmpty ? undefined : "url(#glow2)"} strokeDasharray={isEmpty ? "2 3" : undefined} />
                                    {/* Dots nos pontos com valor > 0 */}
                                    {!isEmpty && vals.map((v, i) => v > 0 && (
                                        <circle key={i} cx={padX + (i / (vals.length - 1)) * (W - padX * 2)} cy={padY + (1 - v / maxVal) * (H - padY * 2)} r="2.5" fill="#818cf8" />
                                    ))}
                                </svg>
                            </div>
                            {/* Day labels */}
                            <div className="flex justify-between mt-1.5 px-0.5">
                                {dayLabels.map((d, i) => (
                                    <span key={i} className="text-[9px] text-zinc-600">{d}</span>
                                ))}
                            </div>
                            {isEmpty && (
                                <p className="text-[11px] text-zinc-600 mt-1.5 text-center">Nenhuma prova criada nos últimos 7 dias</p>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* ── BENTO 3: Tempo Médio (Bottom Middle) ── */}
            <div className="block relative overflow-hidden rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors flex flex-col justify-between">
                <div>
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Turnaround</p>
                </div>
                <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-white mb-1">
                        {data.avgTurnaroundDays != null ? data.avgTurnaroundDays : "—"}
                        <span className="text-[14px] font-normal text-zinc-500 ml-1">dias</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">Média para aprovação</p>
                </div>
            </div>

            {/* ── BENTO 4: Alertas (Bottom Right) ── */}
            <div className="block relative overflow-hidden rounded-2xl bg-zinc-950/40 border border-white/5 backdrop-blur-xl p-5 hover:bg-zinc-900/40 transition-colors flex flex-col justify-between">
                <div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-3 ${data.lateProofs > 0 ? 'bg-red-500/10' : 'bg-zinc-800/50'}`}>
                        <svg className={`h-4 w-4 ${data.lateProofs > 0 ? 'text-red-400' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Atrasadas</p>
                </div>
                <div>
                    <h3 className={`text-2xl font-semibold tracking-tight mb-1 ${data.lateProofs > 0 ? 'text-red-400' : 'text-white'}`}>
                        {data.lateProofs}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                        {data.lateProofs > 0 ? "Provas fora do prazo" : "Nenhum atraso"}
                    </p>
                </div>
            </div>

        </div>
    );
}
