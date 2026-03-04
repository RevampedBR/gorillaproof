"use client";

import { useState, useRef, useCallback } from "react";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

const PRESET_COLORS = [
    "#34d399", "#10b981", "#059669",
    "#3b82f6", "#2563eb", "#1d4ed8",
    "#8b5cf6", "#7c3aed", "#6d28d9",
    "#f43f5e", "#e11d48", "#be123c",
    "#f97316", "#ea580c", "#c2410c",
    "#eab308", "#ca8a04", "#a16207",
    "#ec4899", "#db2777", "#be185d",
    "#14b8a6", "#0d9488", "#0f766e",
    "#64748b", "#475569", "#334155",
    "#ffffff", "#a1a1aa", "#18181b",
];

function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hexInput, setHexInput] = useState(value);
    const hsl = hexToHSL(value);

    const handleHexInput = (hex: string) => {
        setHexInput(hex);
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
            onChange(hex);
        }
    };

    const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = hslToHex(parseInt(e.target.value), hsl.s || 70, hsl.l || 50);
        onChange(newHex);
        setHexInput(newHex);
    };

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 h-11 px-3 rounded-xl border border-zinc-700/40 bg-zinc-800/60 hover:border-zinc-600 transition-colors cursor-pointer"
            >
                <div
                    className="h-7 w-7 rounded-lg border border-white/10 shadow-inner"
                    style={{ backgroundColor: value }}
                />
                <span className="text-[13px] font-mono text-zinc-300">{value}</span>
                <svg className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-[280px] rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/40 p-4 space-y-4">
                    {/* Current color preview */}
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: value }} />
                        <div>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Cor selecionada</p>
                            <input
                                type="text"
                                value={hexInput}
                                onChange={(e) => handleHexInput(e.target.value)}
                                className="text-[15px] font-mono font-semibold text-white bg-transparent outline-none w-20"
                            />
                        </div>
                    </div>

                    {/* Hue slider */}
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Matiz</label>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={hsl.h}
                            onChange={handleHueChange}
                            className="w-full h-3 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                            }}
                        />
                    </div>

                    {/* Preset grid */}
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Presets</label>
                        <div className="grid grid-cols-10 gap-1">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => { onChange(color); setHexInput(color); }}
                                    className={`h-6 w-6 rounded-md border transition-all hover:scale-110 ${value === color ? "border-white ring-1 ring-white/30 scale-110" : "border-white/10"}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[12px] text-zinc-300 font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            )}
        </div>
    );
}
