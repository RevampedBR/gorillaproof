"use client";

import { useCallback, useRef } from "react";

interface AnnotationPin {
    id: string;
    number: number;
    posX: number;
    posY: number;
    status: "open" | "resolved";
    preview: string;
}

interface AnnotationCanvasProps {
    pins: AnnotationPin[];
    isAnnotating: boolean;
    activePinId?: string | null;
    onPinClick: (pinId: string) => void;
    onCanvasClick: (posX: number, posY: number) => void;
}

export function AnnotationCanvas({
    pins,
    isAnnotating,
    activePinId,
    onPinClick,
    onCanvasClick,
}: AnnotationCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!isAnnotating || !canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const posX = ((e.clientX - rect.left) / rect.width) * 100;
            const posY = ((e.clientY - rect.top) / rect.height) * 100;

            onCanvasClick(posX, posY);
        },
        [isAnnotating, onCanvasClick]
    );

    return (
        <div
            ref={canvasRef}
            className={`absolute inset-0 z-10 ${isAnnotating ? "cursor-crosshair" : "pointer-events-none"}`}
            onClick={handleClick}
        >
            {pins.map((pin) => (
                <button
                    key={pin.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPinClick(pin.id);
                    }}
                    className={`
                        absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto
                        group z-20 transition-all duration-200
                    `}
                    style={{ left: `${pin.posX}%`, top: `${pin.posY}%` }}
                    title={pin.preview}
                >
                    {/* Pin Circle */}
                    <div
                        className={`
                            h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold
                            shadow-lg transition-all duration-200 border-2
                            ${activePinId === pin.id
                                ? "scale-125 ring-2 ring-offset-1 ring-offset-zinc-950"
                                : "hover:scale-110"
                            }
                            ${pin.status === "open"
                                ? `bg-emerald-500 text-white border-emerald-400 ${activePinId === pin.id ? "ring-emerald-400/50" : ""}`
                                : `bg-zinc-600 text-zinc-300 border-zinc-500 ${activePinId === pin.id ? "ring-zinc-400/50" : ""}`
                            }
                        `}
                    >
                        {pin.number}
                    </div>

                    {/* Pulse on open pins */}
                    {pin.status === "open" && (
                        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                    )}

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 shadow-xl max-w-[200px]">
                            <p className="text-[10px] text-zinc-300 truncate">{pin.preview}</p>
                        </div>
                        <div className="w-2 h-2 bg-zinc-800 border-b border-r border-zinc-700/50 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                    </div>
                </button>
            ))}
        </div>
    );
}
