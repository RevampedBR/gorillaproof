"use client";

import { useState } from "react";

const SHORTCUTS = [
    {
        section: "Viewer", items: [
            { keys: ["Space"], description: "Play/Pause vídeo" },
            { keys: ["←", "→"], description: "Frame anterior/próximo" },
            { keys: ["+", "-"], description: "Zoom in/out" },
            { keys: ["0"], description: "Reset zoom" },
            { keys: ["F"], description: "Fit to width" },
            { keys: ["C"], description: "Toggle comentários" },
            { keys: ["D"], description: "Toggle desenho" },
        ]
    },
    {
        section: "Annotation", items: [
            { keys: ["R"], description: "Ferramenta retângulo" },
            { keys: ["O"], description: "Ferramenta elipse" },
            { keys: ["A"], description: "Ferramenta seta" },
            { keys: ["P"], description: "Ferramenta pincel livre" },
            { keys: ["Esc"], description: "Cancelar desenho" },
        ]
    },
    {
        section: "Navigation", items: [
            { keys: ["?"], description: "Abrir atalhos" },
            { keys: ["G", "D"], description: "Ir ao dashboard" },
        ]
    },
];

export function KeyboardShortcutsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1a2e] border border-zinc-700/60 rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
                    <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
                        ⌨️ Atalhos do teclado
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">✕</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                    {SHORTCUTS.map((group) => (
                        <div key={group.section}>
                            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">{group.section}</h3>
                            <div className="space-y-2">
                                {group.items.map((shortcut, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-[13px] text-zinc-300">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key) => (
                                                <kbd key={key} className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/50 text-[11px] font-mono text-zinc-300 min-w-[24px] text-center">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
