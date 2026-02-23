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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-zinc-800/50 border border-zinc-800/30" />
                ))}
            </div>
        );
    }

    if (!data) return null;

    const weekTrend = data.proofsThisWeek - data.proofsLastWeek;
    const trendIcon = weekTrend > 0 ? "↑" : weekTrend < 0 ? "↓" : "→";
    const trendColor = weekTrend > 0 ? "text-emerald-400" : weekTrend < 0 ? "text-red-400" : "text-zinc-400";

    const stats = [
        { label: "Total Proofs", value: data.totalProofs, icon: "#", color: "from-blue-500/20 to-indigo-500/20", border: "border-blue-500/20" },
        { label: "Versions Created", value: data.totalVersions, icon: "📄", color: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/20" },
        { label: "Approved", value: data.approvedCount, icon: "✓", color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/20" },
        { label: "In Review", value: data.inReviewCount, icon: "👁️", color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/20" },
        { label: "Changes Requested", value: data.changesRequestedCount, icon: "⚠️", color: "from-amber-600/20 to-red-500/20", border: "border-amber-600/20" },
        { label: "Rejected", value: data.rejectedCount, icon: "✗", color: "from-red-500/20 to-rose-500/20", border: "border-red-500/20" },
        { label: "Late Proofs", value: data.lateProofs, icon: "⏰", color: data.lateProofs > 0 ? "from-red-500/20 to-red-600/20" : "from-zinc-700/20 to-zinc-800/20", border: data.lateProofs > 0 ? "border-red-500/30" : "border-zinc-700/20" },
        { label: "Avg Turnaround", value: data.avgTurnaroundDays != null ? `${data.avgTurnaroundDays}d` : "—", icon: "→", color: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/20" },
    ];

    return (
        <div className="space-y-6">
            {/* Stat Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} p-4 transition-all hover:scale-[1.02]`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                            </div>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Row — Completion + Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Completion Rate Ring */}
                <div className="rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-zinc-800/50 p-5">
                    <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-4">Completion Rate</p>
                    <div className="flex items-center gap-6">
                        <div className="relative h-20 w-20">
                            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#2a2a40" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="url(#grad)" strokeWidth="3"
                                    strokeDasharray={`${data.completionRate}, 100`}
                                    strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="grad">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">{data.completionRate}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[14px] text-zinc-300">{data.completedCount} of {data.totalProofs} proofs completed</p>
                            <p className="text-[12px] text-zinc-500 mt-1">{data.totalProofs - data.completedCount} still in progress</p>
                        </div>
                    </div>
                </div>

                {/* Week Trend */}
                <div className="rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-zinc-800/50 p-5">
                    <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-4">Weekly Activity</p>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <div className="flex items-end gap-2 h-16">
                                <div className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full rounded-t-md bg-zinc-700/50" style={{ height: `${Math.max(data.proofsLastWeek * 8, 8)}px`, maxHeight: 56 }} />
                                    <span className="text-[10px] text-zinc-500">Last week</span>
                                    <span className="text-[13px] font-bold text-zinc-300">{data.proofsLastWeek}</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-500" style={{ height: `${Math.max(data.proofsThisWeek * 8, 8)}px`, maxHeight: 56 }} />
                                    <span className="text-[10px] text-zinc-500">This week</span>
                                    <span className="text-[13px] font-bold text-white">{data.proofsThisWeek}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-lg font-bold ${trendColor}`}>{trendIcon} {Math.abs(weekTrend)}</span>
                            <p className="text-[10px] text-zinc-500">vs last week</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
