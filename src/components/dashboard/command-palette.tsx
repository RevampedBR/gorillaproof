"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@/i18n/navigation";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onOpenChange(false);
        },
        [onOpenChange]
    );

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
        >
            <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
                    <svg className="h-5 w-5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search proofs, projects, or people..."
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
                                Type to search across proofs, projects, and team members
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Quick actions */}
                            <div className="px-2 py-1.5">
                                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Quick Actions</span>
                            </div>
                            <button
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-800/60 transition-colors"
                                onClick={() => onOpenChange(false)}
                            >
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-zinc-200">Create new proof</p>
                                    <p className="text-[11px] text-zinc-500">Upload a file for review</p>
                                </div>
                            </button>

                            {/* Placeholder for search results */}
                            <div className="px-2 py-1.5 mt-2">
                                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Results</span>
                            </div>
                            <div className="px-3 py-4 text-center">
                                <p className="text-[12px] text-zinc-500">
                                    No results for &ldquo;{query}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
