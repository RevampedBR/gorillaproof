"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/lib/actions/search";
import { FileText, FolderOpen, User, Search, Loader2 } from "lucide-react";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TYPE_CFG: Record<string, { label: string; Icon: typeof FileText }> = {
    proof: { label: "Provas", Icon: FileText },
    project: { label: "Projetos", Icon: FolderOpen },
    member: { label: "Membros", Icon: User },
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setQuery("");
            setResults([]);
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const doSearch = useCallback((q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        globalSearch(q).then(({ results }) => {
            setResults(results);
            setActiveIndex(0);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleChange = (val: string) => {
        setQuery(val);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => doSearch(val), 300);
    };

    const navigate = (result: SearchResult) => {
        onOpenChange(false);
        router.push(`/pt${result.href}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onOpenChange(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && results[activeIndex]) {
            navigate(results[activeIndex]);
        }
    };

    if (!open) return null;

    // Group results by type
    const grouped: Record<string, SearchResult[]> = {};
    for (const r of results) {
        if (!grouped[r.type]) grouped[r.type] = [];
        grouped[r.type].push(r);
    }

    let flatIndex = -1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
            onKeyDown={handleKeyDown}
        >
            <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
                    {loading ? (
                        <Loader2 className="h-5 w-5 text-zinc-500 shrink-0 animate-spin" />
                    ) : (
                        <Search className="h-5 w-5 text-zinc-500 shrink-0" />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder="Buscar provas, projetos ou membros..."
                        className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-500 outline-none"
                    />
                    <kbd className="inline-flex h-5 items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-400">
                        Esc
                    </kbd>
                </div>

                {/* Results area */}
                <div className="max-h-80 overflow-y-auto p-2">
                    {query.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-[13px] text-zinc-500">
                                Digite para buscar em provas, projetos e membros
                            </p>
                        </div>
                    ) : results.length === 0 && !loading ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-[12px] text-zinc-500">
                                Nenhum resultado para &ldquo;{query}&rdquo;
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {Object.entries(grouped).map(([type, items]) => {
                                const cfg = TYPE_CFG[type] || TYPE_CFG.proof;
                                return (
                                    <div key={type}>
                                        <div className="px-2 py-1.5">
                                            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                                                {cfg.label}
                                            </span>
                                        </div>
                                        {items.map((r) => {
                                            flatIndex++;
                                            const isActive = flatIndex === activeIndex;
                                            const idx = flatIndex;
                                            const Icon = cfg.Icon;
                                            return (
                                                <button
                                                    key={`${r.type}-${r.id}`}
                                                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${isActive ? "bg-zinc-800/80" : "hover:bg-zinc-800/40"}`}
                                                    onClick={() => navigate(r)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                >
                                                    <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
                                                        <Icon className="h-4 w-4 text-zinc-500" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-medium text-zinc-200 truncate">{r.title}</p>
                                                        <p className="text-[11px] text-zinc-500 truncate">{r.subtitle}</p>
                                                    </div>
                                                    {r.status && (
                                                        <span className="text-[9px] font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                                            {r.status}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
