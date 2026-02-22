"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface NotificationEntry {
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    user_id: string;
    proof_id: string;
    users: { id: string; full_name: string | null; email: string } | null;
}

const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
    status_changed: { icon: "🏷️", label: "alterou status" },
    comment_added: { icon: "💬", label: "comentou" },
    comment_resolved: { icon: "✅", label: "resolveu comentário" },
    comment_reopened: { icon: "🔄", label: "reabriu comentário" },
    version_uploaded: { icon: "📤", label: "enviou nova versão" },
    deadline_set: { icon: "📅", label: "definiu prazo" },
    comments_carried: { icon: "📋", label: "copiou comentários" },
};

export function NotificationCenter({ userId }: { userId: string }) {
    const [entries, setEntries] = useState<NotificationEntry[]>([]);
    const [open, setOpen] = useState(false);
    const [lastSeen, setLastSeen] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`/api/notifications?limit=20`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch { }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const stored = localStorage.getItem("gp_notif_seen");
        if (stored) setLastSeen(stored);
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Click outside to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleOpen = () => {
        setOpen(!open);
        if (!open && entries.length > 0) {
            const ts = entries[0].created_at;
            setLastSeen(ts);
            localStorage.setItem("gp_notif_seen", ts);
        }
    };

    const unread = lastSeen
        ? entries.filter((e) => new Date(e.created_at) > new Date(lastSeen) && e.user_id !== userId).length
        : entries.filter((e) => e.user_id !== userId).length;

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 1) return "agora";
        if (diffMin < 60) return `${diffMin}min`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };

    return (
        <div ref={ref} className="relative">
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Notificações"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-zinc-950">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-11 w-80 max-h-96 bg-[#1a1a2e] border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-slide-in-right">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-700/40 flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-zinc-200">Notificações</span>
                        {unread > 0 && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {unread} nova{unread > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto max-h-72">
                        {entries.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <p className="text-[12px] text-zinc-500">Nenhuma notificação</p>
                            </div>
                        ) : (
                            entries
                                .filter((e) => e.user_id !== userId)
                                .slice(0, 15)
                                .map((entry) => {
                                    const config = ACTION_LABELS[entry.action] || { icon: "📌", label: entry.action };
                                    const isNew = lastSeen ? new Date(entry.created_at) > new Date(lastSeen) : true;
                                    const userName = entry.users?.full_name || entry.users?.email || "Alguém";

                                    return (
                                        <div
                                            key={entry.id}
                                            className={`px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${isNew ? "bg-emerald-500/5" : ""}`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <span className="text-[14px] mt-0.5">{config.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] text-zinc-300 leading-snug">
                                                        <strong className="text-zinc-100">{userName}</strong>{" "}
                                                        {config.label}
                                                    </p>
                                                    <span className="text-[10px] text-zinc-600 mt-0.5 block">{formatTime(entry.created_at)}</span>
                                                </div>
                                                {isNew && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
