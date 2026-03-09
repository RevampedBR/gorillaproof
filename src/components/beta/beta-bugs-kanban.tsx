"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getFeedbackList, updateFeedbackStatus, type BetaFeedback } from "@/lib/actions/feedback";

/* ═══ Config ═══ */
const COLUMNS = [
    { key: "new" as const, label: "Novo", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { key: "triaging" as const, label: "Triagem", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
    { key: "in_progress" as const, label: "Em Progresso", color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
    { key: "resolved" as const, label: "Resolvido", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    { key: "wont_fix" as const, label: "Não Corrigir", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" },
];

const SEVERITY_ICONS: Record<string, string> = {
    blocker: "🚫",
    annoying: "😤",
    cosmetic: "💅",
};

const TYPE_BADGES: Record<string, { icon: string; color: string }> = {
    bug: { icon: "🐛", color: "bg-red-500/15 text-red-400 border-red-500/30" },
    suggestion: { icon: "💡", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    confusion: { icon: "🤔", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
};

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h atrás`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d atrás`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ═══ MAIN COMPONENT ═══ */
export function BetaBugsKanban() {
    const [items, setItems] = useState<BetaFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<BetaFeedback | null>(null);
    const [dragItem, setDragItem] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    const fetchData = useCallback(async () => {
        const result = await getFeedbackList();
        if (result.error) {
            setError(result.error);
        } else {
            setItems(result.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Select item and load its notes
    const handleSelect = (item: BetaFeedback) => {
        setSelectedItem(item);
        setAdminNotes(item.admin_notes || "");
    };

    // Drag & drop handlers
    const handleDragStart = (id: string) => {
        setDragItem(id);
    };

    const handleDrop = async (targetStatus: BetaFeedback["status"]) => {
        if (!dragItem) return;
        const item = items.find(i => i.id === dragItem);
        if (!item || item.status === targetStatus) { setDragItem(null); return; }

        // Optimistic update
        setItems(prev => prev.map(i => i.id === dragItem ? { ...i, status: targetStatus } : i));
        if (selectedItem?.id === dragItem) {
            setSelectedItem(prev => prev ? { ...prev, status: targetStatus } : null);
        }
        setDragItem(null);

        await updateFeedbackStatus(item.id, targetStatus);
    };

    // Save admin notes
    const handleSaveNotes = async () => {
        if (!selectedItem) return;
        setSavingNotes(true);
        await updateFeedbackStatus(selectedItem.id, selectedItem.status, adminNotes);
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, admin_notes: adminNotes } : i));
        setSelectedItem(prev => prev ? { ...prev, admin_notes: adminNotes } : null);
        setSavingNotes(false);
    };

    // Change status from detail panel
    const handleStatusChange = async (newStatus: BetaFeedback["status"]) => {
        if (!selectedItem) return;
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, status: newStatus } : i));
        setSelectedItem(prev => prev ? { ...prev, status: newStatus } : null);
        await updateFeedbackStatus(selectedItem.id, newStatus);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-4xl">🔒</span>
                <p className="text-[14px] text-red-400 font-medium">Acesso Restrito</p>
                <p className="text-[13px] text-emerald-400/50">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-emerald-50 flex items-center gap-2">
                        🐛 Beta Bugs
                        <span className="text-[13px] font-normal text-emerald-400/50">({items.length} total)</span>
                    </h1>
                    <p className="text-[13px] text-emerald-400/50 mt-0.5">Arraste os cards entre colunas para atualizar o status</p>
                </div>
                <button
                    onClick={fetchData}
                    className="rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-1.5 text-[13px] text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                >
                    ↻ Atualizar
                </button>
            </div>

            {/* Kanban + Detail Split View */}
            <div className={`flex gap-4 ${selectedItem ? "" : ""}`}>
                {/* Kanban Board */}
                <div className={`flex gap-3 overflow-x-auto pb-4 viewer-styled-scrollbar transition-all ${selectedItem ? "flex-1 min-w-0" : "flex-1"}`}>
                    {COLUMNS.map((col) => {
                        const columnItems = items.filter(i => i.status === col.key);
                        return (
                            <div
                                key={col.key}
                                className="min-w-[220px] flex-1 flex flex-col"
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-1", "ring-emerald-500/30"); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove("ring-1", "ring-emerald-500/30"); }}
                                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("ring-1", "ring-emerald-500/30"); handleDrop(col.key); }}
                            >
                                {/* Column header */}
                                <div className={`flex items-center gap-2 rounded-t-lg border px-3 py-2 ${col.color}`}>
                                    <span className="text-[13px] font-semibold">{col.label}</span>
                                    <span className="ml-auto text-[11px] font-bold opacity-60">{columnItems.length}</span>
                                </div>

                                {/* Column body */}
                                <div className="flex-1 rounded-b-lg border border-t-0 border-emerald-900/20 bg-emerald-950/10 p-2 space-y-2 min-h-[200px]">
                                    {columnItems.length === 0 && (
                                        <p className="text-[11px] text-emerald-400/30 text-center py-8 italic">Nenhum item</p>
                                    )}
                                    {columnItems.map((item) => (
                                        <KanbanCard
                                            key={item.id}
                                            item={item}
                                            isSelected={selectedItem?.id === item.id}
                                            onSelect={() => handleSelect(item)}
                                            onDragStart={() => handleDragStart(item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                {selectedItem && (
                    <div className="w-[380px] shrink-0 rounded-xl border border-emerald-900/25 bg-[oklch(0.10_0.02_155)] overflow-y-auto max-h-[calc(100vh-240px)] viewer-styled-scrollbar">
                        {/* Detail header */}
                        <div className="sticky top-0 flex items-center justify-between border-b border-emerald-900/20 bg-[oklch(0.10_0.02_155)] px-4 py-3 z-10">
                            <span className="text-[13px] font-semibold text-emerald-50">Detalhes</span>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="rounded-lg p-1 text-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Type + Severity badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGES[selectedItem.type]?.color}`}>
                                    {TYPE_BADGES[selectedItem.type]?.icon} {selectedItem.type}
                                </span>
                                <span className="text-[12px] text-emerald-400/60">
                                    {SEVERITY_ICONS[selectedItem.severity]} {selectedItem.severity}
                                </span>
                            </div>

                            {/* Reporter */}
                            <div>
                                <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Reportado por</span>
                                <p className="text-[13px] text-emerald-100 mt-0.5">{selectedItem.user_name || selectedItem.user_email}</p>
                                <p className="text-[11px] text-emerald-400/40">{formatDate(selectedItem.created_at)}</p>
                            </div>

                            {/* Description */}
                            <div>
                                <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Descrição</span>
                                <p className="text-[13px] text-emerald-100 mt-1 whitespace-pre-wrap leading-relaxed">{selectedItem.description}</p>
                            </div>

                            {/* Expected behavior */}
                            {selectedItem.expected_behavior && (
                                <div>
                                    <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Comportamento Esperado</span>
                                    <p className="text-[13px] text-emerald-100 mt-1 whitespace-pre-wrap">{selectedItem.expected_behavior}</p>
                                </div>
                            )}

                            {/* Screenshot */}
                            {selectedItem.screenshot_url && (
                                <div>
                                    <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Screenshot</span>
                                    <a href={selectedItem.screenshot_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={selectedItem.screenshot_url}
                                            alt="Bug screenshot"
                                            className="mt-1 rounded-lg border border-emerald-900/25 w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                    </a>
                                </div>
                            )}

                            {/* Metadata */}
                            <div>
                                <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Metadata</span>
                                <div className="mt-1 rounded-lg border border-emerald-900/20 bg-emerald-950/20 p-2.5 text-[11px] text-emerald-400/50 font-mono space-y-0.5">
                                    <p><span className="text-emerald-400/70">URL:</span> {selectedItem.page_url}</p>
                                    <p><span className="text-emerald-400/70">Browser:</span> {selectedItem.browser_info?.slice(0, 80)}...</p>
                                    <p><span className="text-emerald-400/70">Resolução:</span> {selectedItem.screen_resolution}</p>
                                    {Array.isArray(selectedItem.console_errors) && selectedItem.console_errors.length > 0 && (
                                        <div>
                                            <span className="text-red-400/70">Console Errors ({selectedItem.console_errors.length}):</span>
                                            {selectedItem.console_errors.slice(0, 5).map((err, i) => (
                                                <p key={i} className="text-red-400/50 pl-2 truncate">• {typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : JSON.stringify(err)}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status changer */}
                            <div>
                                <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Status</span>
                                <select
                                    value={selectedItem.status}
                                    onChange={(e) => handleStatusChange(e.target.value as BetaFeedback["status"])}
                                    className="mt-1 w-full rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2 text-[13px] text-emerald-100 focus:outline-none focus:border-emerald-500/50"
                                >
                                    {COLUMNS.map(col => (
                                        <option key={col.key} value={col.key}>{col.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Admin notes */}
                            <div>
                                <span className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wide">Notas do Dev</span>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Adicione notas sobre investigação, causa raiz, PR relacionado..."
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2 text-[13px] text-emerald-100 placeholder:text-emerald-400/30 focus:outline-none focus:border-emerald-500/50 resize-none"
                                />
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={savingNotes}
                                    className="mt-1.5 w-full rounded-lg bg-emerald-600/80 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                >
                                    {savingNotes ? "Salvando..." : "Salvar Notas"}
                                </button>
                            </div>

                            {/* Resolved at */}
                            {selectedItem.resolved_at && (
                                <p className="text-[11px] text-emerald-400/40">
                                    Resolvido em: {new Date(selectedItem.resolved_at).toLocaleString("pt-BR")}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══ KANBAN CARD ═══ */
function KanbanCard({
    item,
    isSelected,
    onSelect,
    onDragStart,
}: {
    item: BetaFeedback;
    isSelected: boolean;
    onSelect: () => void;
    onDragStart: () => void;
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onSelect}
            className={`cursor-pointer rounded-lg border p-2.5 transition-all hover:border-emerald-600/40 ${isSelected
                ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                : "border-emerald-900/20 bg-[oklch(0.11_0.02_155)] hover:bg-emerald-950/40"
                }`}
        >
            {/* Top row: severity + type */}
            <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0 text-[10px] font-medium ${TYPE_BADGES[item.type]?.color}`}>
                    {TYPE_BADGES[item.type]?.icon} {item.type}
                </span>
                <span className="text-sm" title={item.severity}>
                    {SEVERITY_ICONS[item.severity]}
                </span>
            </div>

            {/* Description preview */}
            <p className="text-[12px] text-emerald-100 line-clamp-2 leading-relaxed mb-2">
                {item.description}
            </p>

            {/* Screenshot thumbnail */}
            {item.screenshot_url && (
                <div className="mb-2 rounded border border-emerald-900/20 overflow-hidden">
                    <img
                        src={item.screenshot_url}
                        alt=""
                        className="w-full h-16 object-cover opacity-70"
                    />
                </div>
            )}

            {/* Footer: reporter + time */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400/40 truncate max-w-[120px]">
                    {item.user_name || item.user_email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-emerald-400/30">
                    {formatDate(item.created_at)}
                </span>
            </div>
        </div>
    );
}
