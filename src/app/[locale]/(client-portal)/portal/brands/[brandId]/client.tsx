"use client";

import { Link } from "@/i18n/navigation";

interface ProofItem {
    id: string;
    title: string;
    status: string;
    updated_at: string;
    deadline: string | null;
    tags: string[] | null;
    client_id: string;
    client_name: string;
    client_logo: string | null;
    project_id: string | null;
    project_name: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Rascunho", color: "text-gray-400", bg: "bg-gray-500/10" },
    in_review: { label: "Em Revisão", color: "text-amber-400", bg: "bg-amber-500/10" },
    approved: { label: "Aprovado", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    rejected: { label: "Rejeitado", color: "text-red-400", bg: "bg-red-500/10" },
    changes_requested: { label: "Alterações", color: "text-orange-400", bg: "bg-orange-500/10" },
};

export default function BrandDetailClient({ brandId, proofs }: { brandId: string; proofs: ProofItem[] }) {
    const brandName = proofs.length > 0 ? proofs[0].client_name : "Marca";

    // Group by project
    const byProject = new Map<string | null, ProofItem[]>();
    proofs.forEach(p => {
        const key = p.project_id;
        if (!byProject.has(key)) byProject.set(key, []);
        byProject.get(key)!.push(p);
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/portal"
                    className="text-[12px] text-blue-400/60 hover:text-blue-300 transition-colors"
                >
                    ← Portal
                </Link>
                <span className="text-[12px] text-blue-400/30">/</span>
                <h1 className="text-xl font-bold text-blue-50 tracking-tight">{brandName}</h1>
            </div>

            {/* Proof count */}
            <p className="text-[13px] text-[oklch(0.50_0.03_240)]">
                {proofs.length} {proofs.length === 1 ? "prova" : "provas"}
            </p>

            {proofs.length === 0 ? (
                <div className="rounded-xl border border-blue-900/20 bg-[oklch(0.10_0.02_240)] px-4 py-16 text-center">
                    <svg className="h-12 w-12 mx-auto text-blue-500/15 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12.75A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <p className="text-[14px] font-medium text-blue-200">Nenhuma prova nesta marca</p>
                    <p className="text-[12px] text-[oklch(0.45_0.03_240)] mt-1">
                        As provas aparecerão aqui quando a agência enviá-las
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Array.from(byProject.entries()).map(([projectId, projectProofs]) => (
                        <div key={projectId || "standalone"} className="rounded-xl border border-blue-900/20 bg-[oklch(0.10_0.02_240)]">
                            <div className="px-4 py-2.5 border-b border-blue-900/10">
                                <p className="text-[12px] font-semibold text-blue-300">
                                    {projectProofs[0]?.project_name || "Provas Avulsas"}
                                </p>
                            </div>
                            <div className="divide-y divide-blue-900/10">
                                {projectProofs.map((proof) => {
                                    const status = statusConfig[proof.status] || statusConfig.draft;
                                    return (
                                        <Link
                                            key={proof.id}
                                            href={`/proofs/${proof.id}`}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/5 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-blue-50 truncate">{proof.title}</p>
                                                {proof.tags && proof.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-1">
                                                        {proof.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                                {status.label}
                                            </span>
                                            {proof.deadline && (
                                                <span className="text-[10px] text-[oklch(0.45_0.03_240)]">
                                                    ⏰ {new Date(proof.deadline).toLocaleDateString("pt-BR")}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-[oklch(0.40_0.02_240)] shrink-0">
                                                {new Date(proof.updated_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
