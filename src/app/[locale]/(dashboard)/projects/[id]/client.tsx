"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProofDialog } from "@/components/proofs/create-proof-dialog";
import { bulkUpdateProofStatus, updateProofTags } from "@/lib/actions/proofs";
import { useToast } from "@/components/ui/toast-provider";

interface ProjectDetailClientProps {
    project: any;
    proofs: any[];
}

const PROOF_STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    in_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    changes_requested: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

const PROOF_STATUS_KEYS: Record<string, string> = {
    draft: "draft",
    in_review: "inReview",
    approved: "approved",
    rejected: "rejected",
    changes_requested: "changesRequested",
};

const FILE_TYPE_ICON: Record<string, string> = {
    image: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
    video: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5",
    pdf: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
};

export function ProjectDetailClient({ project, proofs }: ProjectDetailClientProps) {
    const t = useTranslations("dashboard.projects");

    const totalVersions = proofs.reduce((acc: number, p: any) => acc + (p.versions?.length || 0), 0);
    const approvedCount = proofs.filter((p: any) => p.status === "approved").length;
    const inReviewCount = proofs.filter((p: any) => p.status === "in_review").length;

    // Status filter tabs
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const STATUS_TABS = [
        { key: "all", label: "All", count: proofs.length },
        { key: "active", label: "Active", count: proofs.filter((p: any) => ["in_review", "changes_requested"].includes(p.status)).length },
        { key: "approved", label: "Approved", count: approvedCount },
        { key: "changes_requested", label: "Changes", count: proofs.filter((p: any) => p.status === "changes_requested").length },
        { key: "completed", label: "Completed", count: proofs.filter((p: any) => ["approved", "rejected", "not_relevant"].includes(p.status)).length },
    ];
    const filteredProofs = statusFilter === "all" ? proofs
        : statusFilter === "active" ? proofs.filter((p: any) => ["in_review", "changes_requested"].includes(p.status))
            : statusFilter === "completed" ? proofs.filter((p: any) => ["approved", "rejected", "not_relevant"].includes(p.status))
                : proofs.filter((p: any) => p.status === statusFilter);

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkAction = async (action: string) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const result = await bulkUpdateProofStatus(ids, action, project.id);
        if (result.error) {
            toast(result.error, "error");
        } else {
            toast(`✅ ${ids.length} proof(s) atualizados para ${action}`, "success");
            setSelectedIds(new Set());
        }
    };

    // Tag colors
    const TAG_COLORS: Record<string, string> = {
        urgent: "bg-red-500/20 text-red-300 border-red-500/30",
        design: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        video: "bg-violet-500/20 text-violet-300 border-violet-500/30",
        copy: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        final: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };

    return (
        <div className="flex flex-col h-full">
            {/* ═══ HERO HEADER with Gradient ═══ */}
            <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-zinc-800/50">
                {/* Decorative gradient blobs */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl" />

                <div className="relative z-10 px-8 py-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-5">
                        <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                            {t("backToDashboard")}
                        </Link>
                        <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className="text-white font-medium">{project.name}</span>
                    </div>

                    {/* Project Title */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
                            {project.description && (
                                <p className="text-[15px] text-zinc-300/80 mt-2 max-w-xl leading-relaxed">{project.description}</p>
                            )}
                            <p className="text-[12px] text-zinc-500 mt-3 flex items-center gap-2">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                {new Date(project.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                        </div>
                        <CreateProofDialog projectId={project.id}>
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[14px] h-11 px-6 rounded-xl shadow-lg shadow-emerald-500/20 font-semibold transition-all hover:shadow-emerald-500/30 hover:scale-[1.02]"
                            >
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                {t("createProof")}
                            </Button>
                        </CreateProofDialog>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 mt-7">
                        {[
                            { label: "Proofs", value: proofs.length, color: "from-blue-500 to-indigo-500", icon: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" },
                            { label: "Versions", value: totalVersions, color: "from-violet-500 to-purple-500", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
                            { label: "Approved", value: approvedCount, color: "from-emerald-500 to-teal-500", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                            { label: "In Review", value: inReviewCount, color: "from-amber-500 to-orange-500", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ PROOFS GRID ═══ */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t("proofsTitle")}
                        <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {proofs.length}
                        </Badge>
                    </h2>
                </div>

                {/* ═══ STATUS FILTER TABS ═══ */}
                <div className="flex items-center gap-1 mb-5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${statusFilter === tab.key
                                ? "bg-[#1a8cff]/20 text-[#1a8cff] border border-[#1a8cff]/30 shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key
                                ? "bg-[#1a8cff]/20 text-[#1a8cff]"
                                : "bg-zinc-800 text-zinc-500"
                                }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {proofs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border-2 border-dashed border-zinc-800/60 bg-zinc-900/20">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-5 border border-emerald-500/20">
                            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-[16px] font-semibold text-zinc-200">{t("noProofs")}</h3>
                        <p className="text-[13px] text-zinc-500 mt-2 max-w-sm">Upload your first proof to start collecting feedback and approvals from your team.</p>
                        <div className="mt-6">
                            <CreateProofDialog projectId={project.id}>
                                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[13px] h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/15">
                                    + {t("createProof")}
                                </Button>
                            </CreateProofDialog>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredProofs.map((proof: any, index: number) => {
                            // Compute comment stats from nested versions→comments
                            const allComments = (proof.versions || []).flatMap((v: any) => v.comments || []);
                            const openComments = allComments.filter((c: any) => c.status === "open").length;
                            const totalComments = allComments.length;

                            // Deadline helpers
                            const deadline = proof.deadline ? new Date(proof.deadline) : null;
                            const now = new Date();
                            const msLeft = deadline ? deadline.getTime() - now.getTime() : Infinity;
                            const deadlineColor = msLeft < 0 ? "text-red-400 bg-red-500/10 border-red-500/25" : msLeft < 86400000 ? "text-amber-400 bg-amber-500/10 border-amber-500/25" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";

                            // File type icon
                            const ft = proof.file_type || "image";
                            const ftIcon = FILE_TYPE_ICON[ft] || FILE_TYPE_ICON.image;

                            return (
                                <div key={proof.id} className="relative">
                                    <Link
                                        href={`/proofs/${proof.id}`}
                                        className="group relative flex items-center gap-4 px-5 py-4 rounded-xl border border-zinc-800/60 bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 hover:from-[#1a1a2e] hover:to-[#16213e] hover:border-zinc-700/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
                                    >
                                        {/* Hover glow */}
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 to-blue-500/0 group-hover:from-emerald-500/5 group-hover:to-blue-500/5 transition-all duration-300" />

                                        {/* Bulk Select Checkbox */}
                                        <div
                                            onClick={(e) => toggleSelect(proof.id, e)}
                                            className={`relative z-20 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${selectedIds.has(proof.id) ? "bg-emerald-500 border-emerald-500" : "border-zinc-600 hover:border-zinc-400"}`}
                                        >
                                            {selectedIds.has(proof.id) && (
                                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                            )}
                                        </div>

                                        {/* Number */}
                                        <div className="relative z-10 h-8 w-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-[12px] font-bold text-zinc-400 group-hover:text-white group-hover:bg-gradient-to-br group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all shrink-0">
                                            {index + 1}
                                        </div>

                                        {/* File Type Icon */}
                                        <div className="relative z-10 h-11 w-11 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0 group-hover:border-zinc-600/50 transition-colors">
                                            <svg className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d={ftIcon} />
                                            </svg>
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-10 flex-1 min-w-0">
                                            <p className="text-[15px] font-semibold text-zinc-200 group-hover:text-white truncate transition-colors">
                                                {proof.title}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-[12px] text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {proof.versions?.length || 0} {t("versions")}
                                                </span>
                                                {totalComments > 0 && (
                                                    <>
                                                        <span>·</span>
                                                        <span className={`flex items-center gap-1 ${openComments > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                                            💬 {openComments > 0 ? `${openComments} aberto${openComments > 1 ? "s" : ""}` : `${totalComments} ✓`}
                                                        </span>
                                                    </>
                                                )}
                                                <span>·</span>
                                                <span>
                                                    {new Date(proof.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                                </span>
                                            </div>
                                            {/* Tag Pills */}
                                            {proof.tags && proof.tags.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1.5">
                                                    {proof.tags.map((tag: string) => (
                                                        <span key={tag} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[tag.toLowerCase()] || "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"}`}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Deadline + Status + Arrow */}
                                        <div className="relative z-10 flex items-center gap-2">
                                            {deadline && (
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${deadlineColor}`}>
                                                    {msLeft < 0 ? "⏰ " : "📅 "}
                                                    {deadline.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                                </span>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] px-3 py-1 ${PROOF_STATUS_COLORS[proof.status] || PROOF_STATUS_COLORS.draft}`}
                                            >
                                                {t(PROOF_STATUS_KEYS[proof.status] || "draft")}
                                            </Badge>
                                            <svg className="h-5 w-5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ═══ BULK ACTION BAR ═══ */}
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a2e] border border-zinc-700/60 rounded-xl px-5 py-3 shadow-2xl shadow-black/40">
                        <span className="text-[13px] font-semibold text-white">{selectedIds.size} selecionado(s)</span>
                        <div className="h-5 w-px bg-zinc-700" />
                        <button onClick={() => handleBulkAction("approved")} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer">✅ Aprovar</button>
                        <button onClick={() => handleBulkAction("changes_requested")} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[12px] font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer">🔄 Alterações</button>
                        <button onClick={() => handleBulkAction("rejected")} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[12px] font-semibold hover:bg-red-500/30 transition-colors cursor-pointer">❌ Rejeitar</button>
                        <div className="h-5 w-px bg-zinc-700" />
                        <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg bg-zinc-700/50 text-zinc-400 text-[12px] font-medium hover:bg-zinc-700 transition-colors cursor-pointer">Limpar</button>
                    </div>
                )}
            </div>
        </div>
    );
}
