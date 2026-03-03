"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { getGradient } from "@/utils/gradient-utils";

interface ProofItem {
    id: string;
    title: string;
    status: string;
    tags: string[] | null;
    updated_at: string;
}

interface ProjectItem {
    id: string;
    name: string;
    status: string;
    proofs: ProofItem[];
}

interface ClientItem {
    id: string;
    name: string;
    description: string | null;
    logo_url?: string | null;
    status: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
    projects: ProjectItem[];
    proofs?: { id: string; title: string; status: string; tags: string[] | null; updated_at: string; project_id: string | null }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Ativo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    archived: { label: "Arquivado", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

const PROOF_STATUS: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "text-zinc-400" },
    in_review: { label: "Em revisão", color: "text-blue-400" },
    approved: { label: "Aprovado", color: "text-emerald-400" },
    rejected: { label: "Rejeitado", color: "text-red-400" },
    changes_requested: { label: "Alterações", color: "text-amber-400" },
};

type ViewMode = "grid" | "tree";

export function ClientsListClient({ clients }: { clients: ClientItem[] }) {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<ViewMode>("tree");
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        if (!search.trim()) return clients;
        const q = search.toLowerCase();
        return clients.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.description && c.description.toLowerCase().includes(q)) ||
                c.projects?.some(p =>
                    p.name.toLowerCase().includes(q) ||
                    p.proofs?.some(pr => pr.title.toLowerCase().includes(q))
                )
        );
    }, [clients, search]);

    const toggleClient = (id: string) => {
        setExpandedClients(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleProject = (id: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedClients(new Set(filtered.map(c => c.id)));
        setExpandedProjects(new Set(filtered.flatMap(c => c.projects?.map(p => p.id) || [])));
    };

    const collapseAll = () => {
        setExpandedClients(new Set());
        setExpandedProjects(new Set());
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-100">Clientes</h1>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                        {clients.length} cliente{clients.length !== 1 ? "s" : ""} no seu workspace
                    </p>
                </div>

                <CreateClientDialog>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors cursor-pointer">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Novo Cliente
                    </button>
                </CreateClientDialog>
            </div>

            {/* Search + View Toggle */}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar clientes, projetos ou provas..."
                        className="w-full h-8 rounded-lg border border-zinc-800 bg-zinc-900/50 pl-9 pr-3 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-0.5">
                    <button
                        onClick={() => setView("tree")}
                        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${view === "tree" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        title="Explorer"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setView("grid")}
                        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${view === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        title="Grid"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                    </button>
                </div>

                {view === "tree" && (
                    <div className="flex items-center gap-1">
                        <button onClick={expandAll} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-zinc-800/40">
                            Expandir tudo
                        </button>
                        <button onClick={collapseAll} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-zinc-800/40">
                            Recolher
                        </button>
                    </div>
                )}
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-11 w-11 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                        <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-medium text-zinc-300">
                        {search ? "Nenhum resultado encontrado" : "Nenhum cliente ainda"}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-1">
                        {search
                            ? "Tente outro termo de busca."
                            : "Crie seu primeiro cliente para começar."}
                    </p>
                </div>
            ) : view === "grid" ? (
                /* ━━━ Grid View ━━━ */
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((client) => {
                        const config = STATUS_CONFIG[client.status] || STATUS_CONFIG.active;
                        const projectCount = client.projects?.length || 0;
                        const gradient = getGradient(client.name + client.id);

                        return (
                            <Link
                                key={client.id}
                                href={`/clients/${client.id}`}
                                className="group rounded-2xl border border-white/5 bg-zinc-950/40 overflow-hidden hover:border-zinc-700/60 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
                            >
                                {/* ── Gradient Banner ── */}
                                <div className={`relative h-28 bg-gradient-to-br ${gradient}`}>
                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-black/30 backdrop-blur-md border-white/20 text-white font-medium">
                                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                                            {config.label}
                                        </Badge>
                                    </div>

                                    {/* Avatar overlapping the banner bottom */}
                                    <div className="absolute bottom-0 left-4 translate-y-1/2">
                                        <div className="h-12 w-12 rounded-full border-[3px] border-zinc-950 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-lg">
                                            {client.logo_url ? (
                                                <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-[16px] font-bold text-zinc-200">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Card Body ── */}
                                <div className="px-4 pt-8 pb-4">
                                    <h3 className="text-[14px] font-semibold text-zinc-200 group-hover:text-white truncate">
                                        {client.name}
                                    </h3>

                                    {client.description && (
                                        <p className="text-[12px] text-zinc-500 line-clamp-1 mt-0.5">
                                            {client.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-1.5 mt-3 text-zinc-500">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                        </svg>
                                        <span className="text-[11px]">
                                            {projectCount} projeto{projectCount !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                /* ━━━ Tree / Explorer View ━━━ */
                <div className="rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-xl overflow-hidden divide-y divide-white/5">
                    {filtered.map((client) => {
                        const isExpanded = expandedClients.has(client.id);
                        const projectCount = client.projects?.length || 0;
                        const looseProofs = (client.proofs || []).filter(p => !p.project_id);
                        const proofCount = (client.projects?.reduce((acc, p) => acc + (p.proofs?.length || 0), 0) || 0) + looseProofs.length;

                        return (
                            <div key={client.id}>
                                {/* Client row */}
                                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-900/40 transition-colors group">
                                    <button
                                        onClick={() => toggleClient(client.id)}
                                        className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                    >
                                        <svg className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </button>

                                    {/* Client Logo / Initial */}
                                    <div className="h-8 w-8 rounded-full border border-white/5 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                        {client.logo_url ? (
                                            <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[11px] font-bold text-zinc-300">
                                                {client.name.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                                        <span className="text-[13px] font-semibold text-zinc-200 group-hover:text-white truncate block">
                                            {client.name}
                                        </span>
                                    </Link>

                                    <span className="text-[10px] text-zinc-600 shrink-0">
                                        {projectCount}p · {proofCount} prova{proofCount !== 1 ? "s" : ""}
                                    </span>

                                    <Link href={`/clients/${client.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <svg className="h-3.5 w-3.5 text-zinc-500 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </Link>
                                </div>

                                {/* Projects (expanded) */}
                                {isExpanded && (
                                    <div className="bg-zinc-950/30">
                                        {(!client.projects || client.projects.length === 0) && looseProofs.length === 0 ? (
                                            <div className="pl-16 pr-4 py-2.5">
                                                <span className="text-[11px] text-zinc-600 italic">Nenhum projeto ou prova</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Loose proofs (without project) */}
                                                {looseProofs.map((proof) => {
                                                    const proofStatus = PROOF_STATUS[proof.status] || PROOF_STATUS.draft;
                                                    return (
                                                        <Link
                                                            key={proof.id}
                                                            href={`/proofs/${proof.id}`}
                                                            className="flex items-center gap-3 pl-16 pr-4 py-2 hover:bg-zinc-800/20 transition-colors group/proof"
                                                        >
                                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 shrink-0" />
                                                            <div className="h-5 w-5 rounded bg-zinc-800/60 flex items-center justify-center shrink-0">
                                                                <svg className="h-2.5 w-2.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                </svg>
                                                            </div>
                                                            <span className="text-[11px] text-zinc-400 group-hover/proof:text-zinc-200 truncate flex-1 transition-colors">
                                                                {proof.title}
                                                            </span>
                                                            <span className={`text-[10px] ${proofStatus.color} shrink-0`}>
                                                                {proofStatus.label}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}

                                                {/* Projects */}
                                                {client.projects.map((project) => {
                                                    const projExpanded = expandedProjects.has(project.id);
                                                    const proofCount = project.proofs?.length || 0;

                                                    return (
                                                        <div key={project.id}>
                                                            {/* Project row */}
                                                            <div className="flex items-center gap-3 pl-10 pr-4 py-2 hover:bg-zinc-800/40 transition-colors group/proj">
                                                                <button
                                                                    onClick={() => toggleProject(project.id)}
                                                                    className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                                                >
                                                                    <svg className={`h-3 w-3 transition-transform ${projExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                                    </svg>
                                                                </button>

                                                                <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                                    <svg className="h-3 w-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                                    </svg>
                                                                </div>

                                                                <Link href={`/clients/${client.id}/projects/${project.id}`} className="flex-1 min-w-0">
                                                                    <span className="text-[12px] font-medium text-zinc-300 group-hover/proj:text-white truncate block">
                                                                        {project.name}
                                                                    </span>
                                                                </Link>

                                                                <span className="text-[10px] text-zinc-600 shrink-0">
                                                                    {proofCount} prova{proofCount !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>

                                                            {/* Proofs (expanded) */}
                                                            {projExpanded && (
                                                                <div className="bg-zinc-950/20">
                                                                    {(!project.proofs || project.proofs.length === 0) ? (
                                                                        <div className="pl-24 pr-4 py-2">
                                                                            <span className="text-[11px] text-zinc-600 italic">Nenhuma prova</span>
                                                                        </div>
                                                                    ) : (
                                                                        project.proofs.map((proof) => {
                                                                            const proofStatus = PROOF_STATUS[proof.status] || PROOF_STATUS.draft;
                                                                            return (
                                                                                <Link
                                                                                    key={proof.id}
                                                                                    href={`/proofs/${proof.id}`}
                                                                                    className="flex items-center gap-3 pl-20 pr-4 py-2 hover:bg-zinc-800/20 transition-colors group/proof"
                                                                                >
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 shrink-0" />

                                                                                    <div className="h-5 w-5 rounded bg-zinc-800/60 flex items-center justify-center shrink-0">
                                                                                        <svg className="h-2.5 w-2.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                                        </svg>
                                                                                    </div>

                                                                                    <span className="text-[11px] text-zinc-400 group-hover/proof:text-zinc-200 truncate flex-1 transition-colors">
                                                                                        {proof.title}
                                                                                    </span>

                                                                                    <span className={`text-[10px] ${proofStatus.color} shrink-0`}>
                                                                                        {proofStatus.label}
                                                                                    </span>
                                                                                </Link>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
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
