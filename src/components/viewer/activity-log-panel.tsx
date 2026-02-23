"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivityLog, type ActivityEntry } from "@/lib/actions/activity";

interface ActivityLogPanelProps {
    proofId: string;
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    version_uploaded: { icon: "📤", label: "Enviou nova versão", color: "text-blue-400" },
    comment_added: { icon: "💬", label: "Adicionou comentário", color: "text-emerald-400" },
    comment_resolved: { icon: "✓", label: "Resolveu comentário", color: "text-green-400" },
    comment_reopened: { icon: "🔄", label: "Reabriu comentário", color: "text-amber-400" },
    status_changed: { icon: "🏷️", label: "Alterou status", color: "text-violet-400" },
    deadline_set: { icon: "📅", label: "Definiu prazo", color: "text-cyan-400" },
    deadline_removed: { icon: "📅", label: "Removeu prazo", color: "text-zinc-400" },
    comments_carried: { icon: "↳", label: "Copiou comentários", color: "text-violet-400" },
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

    useEffect(() => { refresh(); }, [refresh]);

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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-[#2a2a40] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[13px] font-semibold text-zinc-200">Atividade</span>
                    <span className="text-[10px] text-zinc-500 bg-[#2a2a40] px-1.5 py-0.5 rounded-full">{entries.length}</span>
                </div>
                <button
                    onClick={refresh}
                    className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors cursor-pointer"
                    title="Atualizar"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[12px] text-zinc-500">Nenhuma atividade registrada</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {entries.map((entry, idx) => {
                            const config = ACTION_CONFIG[entry.action] || { icon: "•", label: entry.action, color: "text-zinc-400" };
                            const user = entry.users;
                            const userName = user?.full_name || user?.email || "Usuário";
                            const detail = getDetailText(entry);

                            return (
                                <div key={entry.id} className="flex gap-3 group relative">
                                    {/* Timeline line */}
                                    {idx < entries.length - 1 && (
                                        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[#2a2a40]" />
                                    )}

                                    {/* Avatar */}
                                    <div className="h-7 w-7 rounded-full bg-[#2a2a40] flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 z-10 border border-[#3a3a55]">
                                        {user ? getInitials(user.full_name, user.email) : "?"}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-4 min-w-0">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[12px] font-semibold text-zinc-200 truncate">{userName}</span>
                                            <span className={`text-[11px] ${config.color}`}>
                                                {config.icon} {config.label}
                                            </span>
                                            {detail && (
                                                <span className="text-[10px] text-zinc-500 bg-[#2a2a40] px-1.5 py-0.5 rounded">
                                                    {detail}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-zinc-600 mt-0.5 block">
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
