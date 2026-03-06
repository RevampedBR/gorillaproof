"use client";

import { useState, useCallback } from "react";
import {
    getChecklistItems,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    type ChecklistItem,
} from "@/lib/actions/checklists";
import { CheckSquare, Square, Plus, Trash2, Loader2 } from "lucide-react";

interface ChecklistPanelProps {
    proofId: string;
    initialItems?: ChecklistItem[];
}

export function ChecklistPanel({ proofId, initialItems }: ChecklistPanelProps) {
    const [items, setItems] = useState<ChecklistItem[]>(initialItems ?? []);
    const [newLabel, setNewLabel] = useState("");
    const [adding, setAdding] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const refresh = useCallback(async () => {
        const { data } = await getChecklistItems(proofId);
        setItems(data);
    }, [proofId]);

    const handleAdd = async () => {
        if (!newLabel.trim() || adding) return;
        setAdding(true);
        const { data, error } = await addChecklistItem(proofId, newLabel);
        if (!error && data) {
            setItems((prev) => [...prev, data]);
            setNewLabel("");
        }
        setAdding(false);
    };

    const handleToggle = async (itemId: string) => {
        setLoadingIds((s) => new Set(s).add(itemId));
        // Optimistic update
        setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i))
        );
        const { error } = await toggleChecklistItem(itemId, proofId);
        if (error) await refresh(); // Revert on error
        setLoadingIds((s) => {
            const n = new Set(s);
            n.delete(itemId);
            return n;
        });
    };

    const handleRemove = async (itemId: string) => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        await removeChecklistItem(itemId, proofId);
    };

    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800/60">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold text-zinc-300 uppercase tracking-wider">
                        Checklist
                    </span>
                    {total > 0 && (
                        <span className="text-[11px] text-zinc-500">
                            {checked}/{total}
                        </span>
                    )}
                </div>
                {total > 0 && (
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 viewer-styled-scrollbar">
                {items.length === 0 && (
                    <div className="text-center py-8">
                        <CheckSquare className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-[12px] text-zinc-600">Nenhum item na checklist</p>
                        <p className="text-[11px] text-zinc-700 mt-1">Adicione itens abaixo</p>
                    </div>
                )}
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.03] transition-colors group"
                    >
                        <button
                            onClick={() => handleToggle(item.id)}
                            disabled={loadingIds.has(item.id)}
                            className="shrink-0 cursor-pointer disabled:opacity-50"
                        >
                            {loadingIds.has(item.id) ? (
                                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                            ) : item.checked ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400" />
                            ) : (
                                <Square className="h-4 w-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
                            )}
                        </button>
                        <span
                            className={`flex-1 text-[13px] leading-tight transition-colors ${item.checked
                                    ? "text-zinc-600 line-through"
                                    : "text-zinc-300"
                                }`}
                        >
                            {item.label}
                        </span>
                        <button
                            onClick={() => handleRemove(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-zinc-600 hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add input */}
            <div className="px-3 py-3 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        placeholder="Novo item..."
                        className="flex-1 bg-zinc-800/50 border border-white/5 rounded-lg px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/30"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newLabel.trim() || adding}
                        className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                        {adding ? (
                            <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
