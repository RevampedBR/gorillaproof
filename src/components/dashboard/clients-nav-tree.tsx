"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Proof { id: string; title: string; status: string; }
interface Project { id: string; name: string; proofs?: Proof[]; }
interface Client { id: string; name: string; logo_url?: string | null; projects?: Project[]; }

interface NavTreeProps {
    refreshKey?: number;
}

export function ClientsNavTree({ refreshKey = 0 }: NavTreeProps) {
    const pathname = usePathname();
    const [clients, setClients] = useState<Client[]>([]);
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const fetchClients = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: memberships } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id);

        if (!memberships || memberships.length === 0) { setClients([]); setLoading(false); return; }

        const orgIds = memberships.map(m => m.organization_id);

        const { data } = await supabase
            .from("clients")
            .select(`
                id, name, logo_url,
                projects (
                    id, name,
                    proofs ( id, title, status )
                )
            `)
            .in("organization_id", orgIds)
            .order("updated_at", { ascending: false });

        setClients((data as Client[]) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients, refreshKey, pathname]);

    // Auto-expand active client/project based on current path
    useEffect(() => {
        const clean = pathname.replace(/^\/(pt|en)/, "");
        clients.forEach(c => {
            const clientPath = `/clients/${c.id}`;
            if (clean.startsWith(clientPath)) {
                setExpandedClients(prev => new Set([...prev, c.id]));
                c.projects?.forEach(p => {
                    if (clean.includes(p.id)) {
                        setExpandedProjects(prev => new Set([...prev, p.id]));
                    }
                });
            }
        });
    }, [pathname, clients]);

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

    const isActive = (path: string) => {
        const clean = pathname.replace(/^\/(pt|en)/, "");
        return clean === path || clean.startsWith(path + "/");
    };

    if (loading) {
        return (
            <div className="px-2 py-1 space-y-1">
                {[1, 2].map(i => (
                    <div key={i} className="h-7 rounded-md bg-zinc-800/30 animate-pulse" />
                ))}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <p className="px-3 py-1 text-[11px] text-zinc-600 italic">Nenhum cliente ainda</p>
        );
    }

    return (
        <div className="space-y-0.5">
            {clients.map(client => {
                const clientExpanded = expandedClients.has(client.id);
                const clientPath = `/clients/${client.id}`;
                const hasProjects = (client.projects?.length || 0) > 0;

                return (
                    <div key={client.id}>
                        {/* Client row */}
                        <div className="flex items-center gap-0.5">
                            {/* Expand toggle */}
                            <button
                                onClick={() => toggleClient(client.id)}
                                className="h-6 w-5 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-400 shrink-0 transition-colors"
                                aria-label={clientExpanded ? "Recolher" : "Expandir"}
                            >
                                <svg
                                    className={`h-3 w-3 transition-transform ${clientExpanded ? "rotate-90" : ""}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>

                            {/* Client link */}
                            <Link
                                href={clientPath as any}
                                className={`flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px] font-medium transition-colors min-w-0 ${isActive(clientPath)
                                    ? "bg-zinc-800/80 text-zinc-100"
                                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"}`}
                            >
                                {/* Avatar */}
                                {client.logo_url ? (
                                    <img src={client.logo_url} alt={client.name} className="h-4 w-4 rounded object-cover shrink-0" />
                                ) : (
                                    <div className="h-4 w-4 rounded bg-zinc-700 flex items-center justify-center shrink-0">
                                        <span className="text-[8px] font-bold text-zinc-400">{client.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                                <span className="truncate">{client.name}</span>
                                {hasProjects && (
                                    <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{client.projects!.length}</span>
                                )}
                            </Link>
                        </div>

                        {/* Projects */}
                        {clientExpanded && hasProjects && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-zinc-800/60 pl-2">
                                {client.projects!.map(project => {
                                    const projectPath = `/clients/${client.id}/projects/${project.id}`;
                                    const projectExpanded = expandedProjects.has(project.id);
                                    const hasProofs = (project.proofs?.length || 0) > 0;

                                    return (
                                        <div key={project.id}>
                                            <div className="flex items-center gap-0.5">
                                                {/* Expand proofs */}
                                                <button
                                                    onClick={() => toggleProject(project.id)}
                                                    className={`h-5 w-4 flex items-center justify-center rounded text-zinc-700 hover:text-zinc-500 shrink-0 transition-colors ${!hasProofs ? "opacity-0 pointer-events-none" : ""}`}
                                                >
                                                    <svg
                                                        className={`h-2.5 w-2.5 transition-transform ${projectExpanded ? "rotate-90" : ""}`}
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                    </svg>
                                                </button>

                                                <Link
                                                    href={projectPath as any}
                                                    className={`flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] transition-colors min-w-0 ${isActive(projectPath)
                                                        ? "bg-zinc-800/60 text-zinc-200"
                                                        : "text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300"}`}
                                                >
                                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                    </svg>
                                                    <span className="truncate">{project.name}</span>
                                                </Link>
                                            </div>

                                            {/* Proofs */}
                                            {projectExpanded && hasProofs && (
                                                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800/40 pl-2">
                                                    {project.proofs!.map(proof => (
                                                        <Link
                                                            key={proof.id}
                                                            href={`/proofs/${proof.id}` as any}
                                                            className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] transition-colors min-w-0 ${isActive(`/proofs/${proof.id}`)
                                                                ? "bg-zinc-800/60 text-zinc-200"
                                                                : "text-zinc-600 hover:bg-zinc-800/30 hover:text-zinc-400"}`}
                                                        >
                                                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${proof.status === "approved" ? "bg-emerald-500" : proof.status === "changes_requested" ? "bg-amber-500" : proof.status === "in_review" ? "bg-blue-400" : "bg-zinc-600"}`} />
                                                            <span className="truncate">{proof.title}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
