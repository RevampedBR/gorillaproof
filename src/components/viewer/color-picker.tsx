"use client";

import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ffffff", // white
    "#000000", // black
];

export function ColorPicker({ color, onChange }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a40] transition-colors"
                title="Change annotation color"
            >
                <div
                    className="h-5 w-5 rounded-full ring-2 ring-[#3a3a55] transition-colors"
                    style={{ backgroundColor: color }}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-[#1e1e32] border border-[#3a3a55] rounded-xl shadow-2xl p-3 z-50 min-w-[180px]">
                    <p className="text-[11px] text-zinc-500 font-medium mb-2">Annotation Color</p>
                    <div className="grid grid-cols-5 gap-2">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => { onChange(c); setIsOpen(false); }}
                                className={`h-7 w-7 rounded-full transition-all hover:scale-110 ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#1e1e32]" : "ring-1 ring-[#3a3a55]"}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                    {/* Custom color input */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2a2a40]">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => { onChange(e.target.value); }}
                            className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                            value={color}
                            onChange={(e) => onChange(e.target.value)}
                            className="flex-1 bg-[#15152a] border border-[#3a3a55] rounded-lg px-2 py-1 text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
