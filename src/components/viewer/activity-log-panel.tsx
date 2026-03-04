"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivityLog, type ActivityEntry } from "@/lib/actions/activity";

interface ActivityLogPanelProps {
    proofId: string;
}

const ACTION_CONFIG: Record<string, { iconPath: string; label: string; color: string }> = {
    version_uploaded: { iconPath: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12", label: "Enviou nova versão", color: "text-blue-400" },
    comment_added: { iconPath: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", label: "Adicionou comentário", color: "text-emerald-400" },
    comment_resolved: { iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3", label: "Resolveu comentário", color: "text-green-400" },
    comment_reopened: { iconPath: "M1 4v6h6 M3.51 15a9 9 0 1014.85-3.36L23 4", label: "Reabriu comentário", color: "text-amber-400" },
    status_changed: { iconPath: "M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15", label: "Alterou status", color: "text-violet-400" },
    deadline_set: { iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2", label: "Definiu prazo", color: "text-cyan-400" },
    deadline_removed: { iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2", label: "Removeu prazo", color: "text-zinc-400" },
    comments_carried: { iconPath: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M15 2H9a1 1 0 00-1 1v1a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z", label: "Copiou comentários", color: "text-violet-400" },
    proof_created: { iconPath: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6", label: "Criou prova", color: "text-blue-400" },
};

const STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho",
    in_review: "Em revisão",
    approved: "Aprovado",
    rejected: "Rejeitado",
    changes_requested: "Alterações solicitadas",
};

export function ActivityLogPanel({ proofId }: ActivityLogPanelProps) {
    const [entries, setEntries] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        const { data } = await getActivityLog(proofId);
        setEntries(data);
        setLoading(false);
    }, [proofId]);

    useEffect(() => {
        // Run refresh without calling setState synchronously in effect
        setTimeout(() => refresh(), 0);
    }, [refresh]);

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return "agora";
        if (diffMin < 60) return `${diffMin}min`;
        if (diffHr < 24) return `${diffHr}h`;
        if (diffDay < 7) return `${diffDay}d`;
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };

    const getInitials = (name: string | null, email: string) => {
        if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        return email.charAt(0).toUpperCase();
    };

    const getDetailText = (entry: ActivityEntry) => {
        const meta = entry.metadata || {};
        if (entry.action === "status_changed" && meta.to) {
            return STATUS_LABELS[meta.to as string] || (meta.to as string);
        }
        if (entry.action === "version_uploaded" && meta.version_number) {
            return `V.${meta.version_number}`;
        }
        if (entry.action === "comments_carried" && meta.count) {
            return `${meta.count} comentário(s)`;
        }
        if (entry.action === "deadline_set" && meta.deadline) {
            return new Date(meta.deadline as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        }
        if (entry.action === "comment_added" && meta.text) {
            return `"${(meta.text as string).slice(0, 50)}${(meta.text as string).length > 50 ? "…" : ""}"`;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[13px] font-semibold text-zinc-200 tracking-wide">Registro de Atividade</span>
                    <span className="text-[10px] font-medium text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full ml-1">{entries.length}</span>
                </div>
                <button
                    onClick={refresh}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Atualizar"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="h-5 w-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-[12px] text-zinc-500">Nenhuma atividade registrada</p>
                    </div>
                ) : (
                    <div className="space-y-0 mt-2">
                        {entries.map((entry, idx) => {
                            const config = ACTION_CONFIG[entry.action] || { iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20z", label: entry.action, color: "text-zinc-400" };
                            const user = entry.users;
                            const userName = user?.full_name || user?.email || "Usuário";
                            const detail = getDetailText(entry);

                            return (
                                <div key={entry.id} className="flex gap-4 group relative">
                                    {/* Timeline line */}
                                    {idx < entries.length - 1 && (
                                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-white/5" />
                                    )}

                                    {/* Avatar */}
                                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 z-10 shadow-sm">
                                        {user ? getInitials(user.full_name, user.email) : "?"}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-5 min-w-0 pt-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13px] font-semibold text-zinc-200 truncate">{userName}</span>
                                            <span className={`flex items-center gap-1.5 text-[11px] font-medium ${config.color}`}>
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={config.iconPath} />
                                                </svg>
                                                {config.label}
                                            </span>
                                            {detail && (
                                                <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md font-medium">
                                                    {detail}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-zinc-600 mt-1 block font-medium">
                                            {formatTime(entry.created_at)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
