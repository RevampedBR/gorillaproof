"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

interface Proof {
    id: string;
    title: string;
    status: string;
    deadline: string | null;
    locked_at: string | null;
    tags: string[] | null;
    project_id: string;
    project_name: string;
    created_at: string;
    updated_at: string;
    versions: { id: string; comments: { id: string; status: string }[] }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    draft: { label: "Draft", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", dot: "bg-zinc-400" },
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
    in_review: { label: "In Review", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
    approved: { label: "Approved", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
    changes_required: { label: "Changes Required", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", dot: "bg-rose-400" },
    completed: { label: "Completed", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", dot: "bg-indigo-400" },
};

const STATUS_TABS = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "active", label: "Active" },
    { key: "in_review", label: "In Review" },
    { key: "approved", label: "Approved" },
    { key: "changes_required", label: "Changes" },
];

export function AllProofsClient({ proofs }: { proofs: Proof[] }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [view, setView] = useState<"list" | "grid">("list");

    const filtered = useMemo(() => {
        let result = proofs;

        if (statusFilter !== "all") {
            result = result.filter((p) => p.status === statusFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    p.project_name.toLowerCase().includes(q)
            );
        }

        return result;
    }, [proofs, statusFilter, search]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: proofs.length };
        proofs.forEach((p) => {
            counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return counts;
    }, [proofs]);

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-100">All Proofs</h1>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                        {proofs.length} total across all projects
                    </p>
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                    <button
                        onClick={() => setView("list")}
                        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${view === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setView("grid")}
                        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${view === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter by name or project..."
                        className="w-full h-8 rounded-lg border border-zinc-800 bg-zinc-900/50 pl-9 pr-3 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
                {STATUS_TABS.map((tab) => {
                    const count = statusCounts[tab.key] || 0;
                    const isActive = statusFilter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap ${isActive
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
                                }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800/60 text-zinc-500"
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-11 w-11 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-medium text-zinc-300">
                        {search || statusFilter !== "all" ? "No proofs match your filters" : "No proofs yet"}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-1">
                        {search || statusFilter !== "all"
                            ? "Try adjusting your search or status filter."
                            : "Create your first proof using the '+ New Proof' button."}
                    </p>
                </div>
            ) : view === "list" ? (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden">
                    <div className="divide-y divide-zinc-800/40">
                        {filtered.map((proof) => {
                            const config = STATUS_CONFIG[proof.status] || STATUS_CONFIG.draft;
                            const commentCount = proof.versions?.reduce(
                                (acc, v) => acc + (v.comments?.length || 0), 0
                            ) || 0;

                            return (
                                <Link
                                    key={proof.id}
                                    href={`/proofs/${proof.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-zinc-800/20 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0">
                                            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate">
                                                {proof.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] text-zinc-500">{proof.project_name}</span>
                                                {commentCount > 0 && (
                                                    <span className="text-[11px] text-zinc-600">
                                                        {commentCount} comment{commentCount !== 1 ? "s" : ""}
                                                    </span>
                                                )}
                                                {proof.deadline && (
                                                    <span className="text-[11px] text-zinc-600">
                                                        Due {new Date(proof.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                        {proof.tags && proof.tags.length > 0 && (
                                            <div className="hidden md:flex items-center gap-1">
                                                {proof.tags.slice(0, 2).map((tag) => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${config.color}`}>
                                            {config.label}
                                        </Badge>
                                        <span className="text-[11px] text-zinc-600 hidden sm:block w-16 text-right">
                                            {new Date(proof.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                        <svg className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((proof) => {
                        const config = STATUS_CONFIG[proof.status] || STATUS_CONFIG.draft;

                        return (
                            <Link
                                key={proof.id}
                                href={`/proofs/${proof.id}`}
                                className="group rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all"
                            >
                                <div className="aspect-[4/3] bg-zinc-800/30 flex items-center justify-center border-b border-zinc-800/40">
                                    <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="p-3 space-y-2">
                                    <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate">
                                        {proof.title}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-zinc-500 truncate">{proof.project_name}</span>
                                        <div className={`h-1.5 w-1.5 rounded-full ${config.dot} shrink-0`} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
