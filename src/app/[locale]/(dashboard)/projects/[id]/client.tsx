"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProofDialog } from "@/components/proofs/create-proof-dialog";
import { bulkUpdateProofStatus, updateProofTags } from "@/lib/actions/proofs";
import { useToast } from "@/components/ui/toast-provider";
import { Calendar, Clock, MessageSquare, Check, RefreshCw, ChevronRight, CheckCircle2, FileText, XCircle, Info, ChevronLeft, Image, Video, FileQuestion, ArrowRight, Plus } from "lucide-react";

interface ProjectDetailClientProps {
    project: any;
    proofs: any[];
}

const PROOF_STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    in_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    changes_requested: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

const PROOF_STATUS_KEYS: Record<string, string> = {
    draft: "draft",
    in_review: "inReview",
    approved: "approved",
    rejected: "rejected",
    changes_requested: "changesRequested",
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
            toast(`${ids.length} proof(s) atualizados para ${action}`, "success");
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

    const FileIcon = ({ type, className }: { type: string, className?: string }) => {
        if (type === "video") return <Video className={className} />;
        if (type === "pdf") return <FileText className={className} />;
        if (type === "image") return <Image className={className} />;
        return <FileQuestion className={className} />;
    };

    return (
        <div className="flex flex-col min-h-full pb-20">
            {/* ═══ HERO HEADER with Gradient ═══ */}
            <div className="relative pt-10 pb-12 overflow-hidden mb-10 border-b border-zinc-800/40">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] opacity-80 pointer-events-none" />
                {/* Decorative gradient blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-6">
                        <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md">
                            <ChevronLeft className="h-4 w-4" />
                            {t("backToDashboard")}
                        </Link>
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                        <span className="text-white font-medium">{project.name}</span>
                    </div>

                    {/* Project Title */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{project.name}</h1>
                            {project.description && (
                                <p className="text-[15px] text-zinc-400 mt-2 max-w-2xl leading-relaxed font-light">{project.description}</p>
                            )}
                            <div className="text-[12px] text-zinc-500 mt-4 flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(project.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                                </span>
                                {(project as any).client?.name && (
                                    <span className="flex items-center gap-1.5 border-l border-zinc-700 pl-4 text-zinc-400">
                                        <div className="h-4 w-4 rounded-sm bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-white">
                                            {(project as any).client.name.charAt(0).toUpperCase()}
                                        </div>
                                        {(project as any).client.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0">
                            <CreateProofDialog projectId={project.id}>
                                <button className="group relative inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-white text-zinc-950 font-medium text-[14px] transition-all hover:bg-zinc-200 hover:scale-[0.98] active:scale-[0.95] shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]">
                                    <Plus className="h-4 w-4" />
                                    {t("createProof")}
                                    <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl group-hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100" />
                                </button>
                            </CreateProofDialog>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                        {[
                            { label: "Proofs", value: proofs.length, color: "from-blue-500/20 to-indigo-500/20", iconColor: "text-blue-400", Icon: FileText },
                            { label: "Versions", value: totalVersions, color: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-400", Icon: RefreshCw },
                            { label: "Approved", value: approvedCount, color: "from-emerald-500/20 to-teal-500/20", iconColor: "text-emerald-400", Icon: CheckCircle2 },
                            { label: "In Review", value: inReviewCount, color: "from-amber-500/20 to-orange-500/20", iconColor: "text-amber-400", Icon: Info },
                        ].map((stat) => (
                            <div key={stat.label} className="flex flex-col relative overflow-hidden bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 transition-shadow hover:bg-white/10 group">
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <stat.Icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                                    <p className="text-[12px] text-zinc-400 font-medium uppercase tracking-wider mt-1">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ PROOFS GRID ═══ */}
            <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-400" />
                        {t("proofsTitle")}
                        <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {proofs.length}
                        </Badge>
                    </h2>

                    {/* ═══ STATUS FILTER TABS ═══ */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/60 rounded-xl p-1 overflow-x-auto hide-scrollbar">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap focus:outline-none ${statusFilter === tab.key
                                    ? "bg-indigo-500/10 text-indigo-400 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                    }`}
                            >
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key
                                    ? "bg-indigo-500/20 text-indigo-300"
                                    : "bg-zinc-800 text-zinc-400"
                                    }`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {proofs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20">
                        <div className="h-16 w-16 rounded-2xl bg-zinc-800 shadow-inner flex items-center justify-center mb-6">
                            <FileText className="h-8 w-8 text-zinc-500" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-zinc-200">{t("noProofs")}</h3>
                        <p className="text-[13px] text-zinc-500 mt-2 max-w-sm">Upload your first proof to start collecting feedback and approvals from your team.</p>
                        <div className="mt-8">
                            <CreateProofDialog projectId={project.id}>
                                <button className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-colors shadow-lg shadow-indigo-500/20">
                                    <Plus className="h-4 w-4" />
                                    {t("createProof")}
                                </button>
                            </CreateProofDialog>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredProofs.map((proof: any, index: number) => {
                            // Compute comment stats from nested versions→comments
                            const allComments = (proof.versions || []).flatMap((v: any) => v.comments || []);
                            const openComments = allComments.filter((c: any) => c.status === "open").length;
                            const totalComments = allComments.length;

                            // Deadline helpers
                            const deadline = proof.deadline ? new Date(proof.deadline) : null;
                            const now = new Date();
                            const msLeft = deadline ? deadline.getTime() - now.getTime() : Infinity;
                            const deadlineColor = msLeft < 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : msLeft < 86400000 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                            // File type icon
                            const ft = proof.file_type || "image";

                            return (
                                <div key={proof.id} className="relative group/card">
                                    <Link
                                        href={`/proofs/${proof.id}`}
                                        className="relative flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            {/* Bulk Select Checkbox */}
                                            <div
                                                onClick={(e) => toggleSelect(proof.id, e)}
                                                className={`relative z-20 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${selectedIds.has(proof.id) ? "bg-indigo-500 border-indigo-500" : "border-zinc-600 hover:border-zinc-400"}`}
                                            >
                                                {selectedIds.has(proof.id) && (
                                                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                                )}
                                            </div>

                                            {/* Number indicator */}
                                            <div className="hidden sm:flex h-8 w-8 rounded-lg bg-zinc-800/80 items-center justify-center text-[12px] font-bold text-zinc-500 group-hover/card:text-zinc-300 transition-colors shrink-0">
                                                {index + 1}
                                            </div>

                                            {/* File Type Icon */}
                                            <div className="h-12 w-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0 text-zinc-400 group-hover/card:text-indigo-400 group-hover/card:border-indigo-500/30 group-hover/card:bg-indigo-500/5 transition-all">
                                                <FileIcon type={ft} className="h-5 w-5" />
                                            </div>

                                            {/* Title & Mobile Meta */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[15px] font-semibold text-zinc-200 group-hover/card:text-white truncate transition-colors">
                                                    {proof.title}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-zinc-500 sm:hidden">
                                                    {proof.tags && proof.tags.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            {proof.tags.slice(0, 2).map((tag: string) => (
                                                                <span key={tag} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[tag.toLowerCase()] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <span className="flex items-center gap-1 text-zinc-400">
                                                        <RefreshCw className="h-3 w-3" /> {proof.versions?.length || 0}
                                                    </span>
                                                    {totalComments > 0 && (
                                                        <span className="flex items-center gap-1 text-zinc-400">
                                                            <MessageSquare className="h-3 w-3" /> {totalComments}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Meta */}
                                        <div className="hidden sm:flex items-center justify-end flex-1 gap-6">
                                            {/* Tag Pills */}
                                            {proof.tags && proof.tags.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    {proof.tags.map((tag: string) => (
                                                        <span key={tag} className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${TAG_COLORS[tag.toLowerCase()] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-[12px] text-zinc-500">
                                                <span className="flex items-center gap-1.5 w-20 justify-end" title="Versions">
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    {proof.versions?.length || 0}
                                                </span>
                                                {totalComments > 0 ? (
                                                    <span className={`flex items-center gap-1.5 w-24 justify-end ${openComments > 0 ? "text-amber-400" : "text-zinc-500"}`} title="Comments">
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        {openComments > 0 ? `${openComments} open` : `${totalComments}`}
                                                    </span>
                                                ) : (
                                                    <span className="w-24 flex justify-end text-zinc-700">-</span>
                                                )}
                                                <span className="w-24 flex justify-end">
                                                    {new Date(proof.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            </div>

                                            {/* Deadline */}
                                            <div className="w-24 flex justify-end">
                                                {deadline ? (
                                                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${deadlineColor}`}>
                                                        {msLeft < 0 ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                                        {deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-700">-</span>
                                                )}
                                            </div>

                                            <div className="w-28 flex justify-end">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-2.5 py-0.5 shadow-sm ${PROOF_STATUS_COLORS[proof.status] || PROOF_STATUS_COLORS.draft}`}
                                                >
                                                    {t(PROOF_STATUS_KEYS[proof.status] || "draft")}
                                                </Badge>
                                            </div>

                                            <div className="w-6 flex justify-end">
                                                <ArrowRight className="h-4 w-4 text-zinc-600 group-hover/card:text-zinc-300 group-hover/card:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ═══ BULK ACTION BAR ═══ */}
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-5">
                        <span className="text-[13px] font-semibold text-white">{selectedIds.size} selected</span>
                        <div className="h-5 w-px bg-zinc-700 mx-1" />
                        <button onClick={() => handleBulkAction("approved")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[12px] font-medium hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => handleBulkAction("changes_requested")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[12px] font-medium hover:bg-amber-500/20 transition-colors">
                            <RefreshCw className="h-3.5 w-3.5" /> Request Changes
                        </button>
                        <button onClick={() => handleBulkAction("rejected")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-colors">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                        <div className="h-5 w-px bg-zinc-700 mx-1" />
                        <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-zinc-400 text-[12px] font-medium hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
                            Clear
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
