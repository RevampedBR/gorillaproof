"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProofDialog } from "@/components/proofs/create-proof-dialog";

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

export function ProjectDetailClient({ project, proofs }: ProjectDetailClientProps) {
    const t = useTranslations("dashboard.projects");

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[12px] text-zinc-500 mb-6">
                <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
                    {t("backToDashboard")}
                </Link>
                <span>/</span>
                <span className="text-zinc-300 font-medium">{project.name}</span>
            </div>

            {/* Project Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{project.name}</h1>
                    {project.description && (
                        <p className="text-[13px] text-zinc-400 mt-1 max-w-lg">{project.description}</p>
                    )}
                    <p className="text-[11px] text-zinc-600 mt-2">
                        Criado em{" "}
                        {new Date(project.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
                <CreateProofDialog projectId={project.id}>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] h-8 px-4 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    >
                        + {t("createProof")}
                    </Button>
                </CreateProofDialog>
            </div>

            {/* Proofs Section */}
            <div className="space-y-4">
                <h2 className="text-[14px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("proofsTitle")}
                    <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {proofs.length}
                    </Badge>
                </h2>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-sm">
                    {proofs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-[14px] font-medium text-zinc-200">{t("noProofs")}</h3>
                            <div className="mt-5">
                                <CreateProofDialog projectId={project.id}>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] h-8 px-4 rounded-md">
                                        + {t("createProof")}
                                    </Button>
                                </CreateProofDialog>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/50">
                            {proofs.map((proof: any) => (
                                <div
                                    key={proof.id}
                                    className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
                                            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate">
                                                {proof.title}
                                            </p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                {proof.versions?.length || 0} {t("versions")} ·{" "}
                                                {new Date(proof.updated_at).toLocaleDateString("pt-BR", {
                                                    day: "2-digit",
                                                    month: "short",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] px-2 py-0.5 ${PROOF_STATUS_COLORS[proof.status] || PROOF_STATUS_COLORS.draft}`}
                                    >
                                        {t(PROOF_STATUS_KEYS[proof.status] || "draft")}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
