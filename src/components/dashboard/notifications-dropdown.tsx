"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface NotifEntry {
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    user_id: string;
    proof_id: string;
    users: { id: string; full_name: string | null; email: string } | null;
}

const ACTION_ICONS: Record<string, { path: string; label: string; color: string }> = {
    proof_created: { path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6", label: "criou uma prova", color: "text-blue-400" },
    status_changed: { path: "M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15", label: "alterou status", color: "text-amber-400" },
    comment_added: { path: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", label: "comentou", color: "text-indigo-400" },
    comment_resolved: { path: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3", label: "resolveu comentário", color: "text-emerald-400" },
    comment_reopened: { path: "M1 4v6h6 M3.51 15a9 9 0 1014.85-3.36L23 4", label: "reabriu comentário", color: "text-orange-400" },
    version_uploaded: { path: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12", label: "enviou nova versão", color: "text-teal-400" },
    deadline_set: { path: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2", label: "definiu prazo", color: "text-red-400" },
    comments_carried: { path: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M15 2H9a1 1 0 00-1 1v1a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z", label: "copiou comentários", color: "text-zinc-400" },
    bulk_status_changed: { path: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", label: "alterou status em lote", color: "text-amber-400" },
};

export function NotificationsDropdown() {
    const [entries, setEntries] = useState<NotifEntry[]>([]);
    const [open, setOpen] = useState(false);
    const [lastSeen, setLastSeen] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications?limit=20");
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const stored = localStorage.getItem("gp_dash_notif_seen");
        if (stored) setLastSeen(stored);
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Click outside
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
            localStorage.setItem("gp_dash_notif_seen", ts);
        }
    };

    const unread = lastSeen
        ? entries.filter(e => new Date(e.created_at) > new Date(lastSeen)).length
        : entries.length;

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 1) return "agora";
        if (diffMin < 60) return `${diffMin}min`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };

    const handleMarkAllRead = () => {
        if (entries.length > 0) {
            const ts = entries[0].created_at;
            setLastSeen(ts);
            localStorage.setItem("gp_dash_notif_seen", ts);
        }
    };

    return (
        <div ref={ref} className="relative">
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
            >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-zinc-950">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-11 w-80 max-h-[420px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[13px] font-semibold text-zinc-100">Notificações</h3>
                            {unread > 0 && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                    {unread} nova{unread > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        {entries.length > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                            >
                                Marcar como lido
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto max-h-[340px]">
                        {entries.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-zinc-800/60 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-[13px] font-medium text-zinc-400">Nenhuma notificação</p>
                                <p className="text-[11px] text-zinc-600 mt-1">
                                    Você verá atualizações quando houver comentários, decisões ou uploads.
                                </p>
                            </div>
                        ) : (
                            entries.slice(0, 15).map((entry) => {
                                const config = ACTION_ICONS[entry.action] || { path: "M12 2a10 10 0 100 20 10 10 0 000-20z", label: entry.action, color: "text-zinc-400" };
                                const isNew = lastSeen ? new Date(entry.created_at) > new Date(lastSeen) : true;
                                const userName = entry.users?.full_name || entry.users?.email?.split("@")[0] || "Alguém";

                                return (
                                    <div
                                        key={entry.id}
                                        className={`px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${isNew ? "bg-emerald-500/5" : ""}`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className={`h-7 w-7 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0 mt-0.5 ${config.color}`}>
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={config.path} />
                                                </svg>
                                            </div>
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
