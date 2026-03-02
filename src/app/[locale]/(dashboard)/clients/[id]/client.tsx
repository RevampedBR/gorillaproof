"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { CreateProofDialog } from "@/components/proofs/create-proof-dialog";

interface ClientDetailProps {
    client: {
        id: string;
        name: string;
        description: string | null;
        logo_url?: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        segment: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        projects: {
            id: string;
            name: string;
            description: string | null;
            status: string;
            created_at: string;
            updated_at: string;
            proofs: { id: string; title: string; status: string; tags: string[] | null; updated_at: string }[];
        }[];
    };
}

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
    active: { label: "Ativo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    archived: { label: "Arquivado", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    completed: { label: "Concluído", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const PROOF_STATUS: Record<string, { label: string; dot: string }> = {
    draft: { label: "Rascunho", dot: "bg-zinc-400" },
    in_review: { label: "Em Revisão", dot: "bg-amber-400" },
    approved: { label: "Aprovada", dot: "bg-emerald-400" },
    rejected: { label: "Rejeitada", dot: "bg-red-400" },
    changes_requested: { label: "Ajustes", dot: "bg-sky-400" },
};

export function ClientDetailClient({ client }: ClientDetailProps) {
    const [expandedProject, setExpandedProject] = useState<string | null>(
        client.projects.length === 1 ? client.projects[0].id : null
    );

    const totalProjects = client.projects.length;
    const totalProofs = client.projects.reduce((acc, p) => acc + (p.proofs?.length || 0), 0);
    const approvedProofs = client.projects.reduce(
        (acc, p) => acc + (p.proofs?.filter((pr) => pr.status === "approved").length || 0), 0
    );

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* ═══ HERO HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-zinc-800/50">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl" />

                <div className="relative z-10 px-8 py-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-5">
                        <Link href="/clients" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            Clientes
                        </Link>
                        <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className="text-white font-medium">{client.name}</span>
                    </div>

                    {/* Title + Create */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-5">
                            {/* Logo ou Iniciais */}
                            <div className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-xl">
                                {client.logo_url ? (
                                    <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-zinc-300">
                                        {client.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">{client.name}</h1>
                                {client.description && (
                                    <p className="text-[15px] text-zinc-300/80 mt-2 max-w-xl leading-relaxed">{client.description}</p>
                                )}
                                {(client.contact_email || client.contact_phone || client.segment) && (
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        {client.segment && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-medium border border-indigo-500/20">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                                </svg>
                                                {client.segment.charAt(0).toUpperCase() + client.segment.slice(1)}
                                            </span>
                                        )}
                                        {client.contact_email && (
                                            <a href={`mailto:${client.contact_email}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 text-[11px] font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                                {client.contact_email}
                                            </a>
                                        )}
                                        {client.contact_phone && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 text-[11px] font-medium border border-white/10">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                                </svg>
                                                {client.contact_phone}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <CreateProjectDialog clientId={client.id}>
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[14px] h-11 px-6 rounded-xl shadow-lg shadow-emerald-500/20 font-semibold"
                            >
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Novo Projeto
                            </Button>
                        </CreateProjectDialog>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-7">
                        {[
                            { label: "Projetos", value: totalProjects, color: "from-blue-500 to-indigo-500" },
                            { label: "Provas", value: totalProofs, color: "from-violet-500 to-purple-500" },
                            { label: "Aprovadas", value: approvedProofs, color: "from-emerald-500 to-teal-500" },
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                    <span className="text-white font-bold text-[14px]">{stat.value}</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ PROJECTS LIST ═══ */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    Projetos
                    <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {totalProjects}
                    </Badge>
                </h2>

                {client.projects.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-zinc-800/40 bg-zinc-900/20">
                        <p className="text-[14px] text-zinc-400">Nenhum projeto ainda</p>
                        <p className="text-[12px] text-zinc-500 mt-1">Crie o primeiro projeto para este cliente.</p>
                    </div>
                ) : (
                    client.projects.map((project) => {
                        const config = PROJECT_STATUS[project.status] || PROJECT_STATUS.active;
                        const proofCount = project.proofs?.length || 0;
                        const isExpanded = expandedProject === project.id;

                        return (
                            <div key={project.id} className="rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-xl overflow-hidden shadow-sm transition-colors hover:bg-zinc-900/40">
                                {/* Project Header (clickable) */}
                                <button
                                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 shadow-inner text-zinc-400">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[14px] font-semibold text-zinc-200 truncate">{project.name}</p>
                                            <p className="text-[11px] text-zinc-500">
                                                {proofCount} prova{proofCount !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${config.color}`}>
                                            {config.label}
                                        </Badge>
                                        <svg className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded: proofs list */}
                                {isExpanded && (
                                    <div className="border-t border-white/5">
                                        {project.proofs.length === 0 ? (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-[12px] text-zinc-500">Nenhuma prova neste projeto.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {project.proofs.map((proof) => {
                                                    const ps = PROOF_STATUS[proof.status] || PROOF_STATUS.draft;
                                                    return (
                                                        <Link
                                                            key={proof.id}
                                                            href={`/proofs/${proof.id}`}
                                                            className="flex items-center justify-between px-4 py-3.5 pl-[4.5rem] hover:bg-white/5 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`h-2 w-2 rounded-full ${ps.dot} shrink-0`} />
                                                                <span className="text-[13px] text-zinc-300 group-hover:text-white truncate">{proof.title}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-[10px] text-zinc-500">{ps.label}</span>
                                                                <svg className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                                </svg>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {/* Footer: Nova Prova + Ver projeto */}
                                        <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
                                            <CreateProofDialog projectId={project.id} clientName={client.name} projectName={project.name}>
                                                <button className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                    Nova Prova
                                                </button>
                                            </CreateProofDialog>
                                            <Link
                                                href={`/clients/${client.id}/projects/${project.id}`}
                                                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                            >
                                                Ver projeto completo →
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
