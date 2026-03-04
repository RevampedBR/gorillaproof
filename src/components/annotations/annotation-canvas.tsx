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

export interface AnnotationShape {
    id: string;
    commentId: string;
    type: "rect" | "circle" | "arrow" | "line" | "pen";
    color: string;
    status: "open" | "resolved";
    // Rect/Circle (percentages 0-100)
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    // Arrow/Line (percentages 0-100)
    x2?: number;
    y2?: number;
    // Pen (percentages 0-100)
    points?: { x: number; y: number }[];
}

interface AnnotationCanvasProps {
    pins: AnnotationPin[];
    shapes?: AnnotationShape[];
    isAnnotating: boolean;
    activePinId?: string | null;
    activeShapeId?: string | null;
    onPinClick: (pinId: string) => void;
    onShapeClick?: (commentId: string) => void;
    onCanvasClick: (posX: number, posY: number) => void;
}

export function AnnotationCanvas({
    pins,
    shapes = [],
    isAnnotating,
    activePinId,
    activeShapeId,
    onPinClick,
    onShapeClick,
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

    const renderShape = (shape: AnnotationShape) => {
        const isActive = activeShapeId === shape.commentId;
        const isResolved = shape.status === "resolved";
        const color = isResolved ? "#71717a" : shape.color;
        const opacity = isResolved ? 0.35 : isActive ? 1 : 0.7;

        const commonClasses = `absolute pointer-events-auto cursor-pointer transition-all duration-200 ${isActive ? "z-20" : "z-10"}`;

        switch (shape.type) {
            case "rect":
                return (
                    <div
                        key={shape.id}
                        id={`shape-${shape.commentId}`}
                        className={commonClasses}
                        style={{
                            left: `${shape.x}%`,
                            top: `${shape.y}%`,
                            width: `${shape.width}%`,
                            height: `${shape.height}%`,
                            border: `2px ${isActive ? "solid" : "dashed"} ${color}`,
                            backgroundColor: `${color}10`,
                            opacity,
                            boxShadow: isActive ? `0 0 12px ${color}60` : undefined,
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onShapeClick?.(shape.commentId);
                        }}
                    />
                );
            case "circle": {
                const cx = (shape.x ?? 0) + (shape.width ?? 0) / 2;
                const cy = (shape.y ?? 0) + (shape.height ?? 0) / 2;
                const rx = (shape.width ?? 0) / 2;
                const ry = (shape.height ?? 0) / 2;
                return (
                    <svg
                        key={shape.id}
                        id={`shape-${shape.commentId}`}
                        className={`${commonClasses} overflow-visible`}
                        style={{
                            left: `${shape.x}%`,
                            top: `${shape.y}%`,
                            width: `${shape.width}%`,
                            height: `${shape.height}%`,
                            opacity,
                        }}
                        viewBox={`0 0 ${shape.width} ${shape.height}`}
                        preserveAspectRatio="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShapeClick?.(shape.commentId);
                        }}
                    >
                        <ellipse
                            cx={rx}
                            cy={ry}
                            rx={rx}
                            ry={ry}
                            fill={`${color}10`}
                            stroke={color}
                            strokeWidth="0.5"
                            strokeDasharray={isActive ? "none" : "2 2"}
                            style={{ filter: isActive ? `drop-shadow(0 0 6px ${color}60)` : undefined }}
                        />
                    </svg>
                );
            }
            case "arrow":
            case "line": {
                const x1 = shape.x ?? 0;
                const y1 = shape.y ?? 0;
                const x2 = shape.x2 ?? 0;
                const y2 = shape.y2 ?? 0;
                const minX = Math.min(x1, x2);
                const minY = Math.min(y1, y2);
                const w = Math.abs(x2 - x1) || 0.5;
                const h = Math.abs(y2 - y1) || 0.5;
                const pad = 2;
                return (
                    <svg
                        key={shape.id}
                        id={`shape-${shape.commentId}`}
                        className={`${commonClasses} overflow-visible`}
                        style={{
                            left: `${minX - pad}%`,
                            top: `${minY - pad}%`,
                            width: `${w + pad * 2}%`,
                            height: `${h + pad * 2}%`,
                            opacity,
                        }}
                        viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
                        preserveAspectRatio="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShapeClick?.(shape.commentId);
                        }}
                    >
                        {shape.type === "arrow" && (
                            <defs>
                                <marker
                                    id={`arrowhead-${shape.id}`}
                                    markerWidth="8"
                                    markerHeight="6"
                                    refX="7"
                                    refY="3"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 8 3, 0 6" fill={color} />
                                </marker>
                            </defs>
                        )}
                        <line
                            x1={x1 - minX + pad}
                            y1={y1 - minY + pad}
                            x2={x2 - minX + pad}
                            y2={y2 - minY + pad}
                            stroke={color}
                            strokeWidth="0.5"
                            strokeDasharray={isActive ? "none" : "2 2"}
                            markerEnd={shape.type === "arrow" ? `url(#arrowhead-${shape.id})` : undefined}
                            style={{ filter: isActive ? `drop-shadow(0 0 6px ${color}60)` : undefined }}
                        />
                        {/* Transparent hit area for easier clicking */}
                        <line
                            x1={x1 - minX + pad}
                            y1={y1 - minY + pad}
                            x2={x2 - minX + pad}
                            y2={y2 - minY + pad}
                            stroke="transparent"
                            strokeWidth="4"
                        />
                    </svg>
                );
            }
            case "pen": {
                if (!shape.points || shape.points.length < 2) return null;
                const xs = shape.points.map((p) => p.x);
                const ys = shape.points.map((p) => p.y);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const maxX = Math.max(...xs);
                const maxY = Math.max(...ys);
                const w = (maxX - minX) || 0.5;
                const h = (maxY - minY) || 0.5;
                const pad = 2;
                const pathData = shape.points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x - minX + pad} ${p.y - minY + pad}`)
                    .join(" ");
                return (
                    <svg
                        key={shape.id}
                        id={`shape-${shape.commentId}`}
                        className={`${commonClasses} overflow-visible`}
                        style={{
                            left: `${minX - pad}%`,
                            top: `${minY - pad}%`,
                            width: `${w + pad * 2}%`,
                            height: `${h + pad * 2}%`,
                            opacity,
                        }}
                        viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
                        preserveAspectRatio="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShapeClick?.(shape.commentId);
                        }}
                    >
                        <path
                            d={pathData}
                            fill="none"
                            stroke={color}
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={isActive ? "none" : "2 2"}
                            style={{ filter: isActive ? `drop-shadow(0 0 6px ${color}60)` : undefined }}
                        />
                        {/* Transparent hit area */}
                        <path d={pathData} fill="none" stroke="transparent" strokeWidth="4" />
                    </svg>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div
            ref={canvasRef}
            className={`absolute inset-0 z-10 ${isAnnotating ? "cursor-crosshair" : "pointer-events-none"}`}
            onClick={handleClick}
        >
            {/* Render comment-linked shapes */}
            {shapes.map((shape) => renderShape(shape))}

            {/* Render pins */}
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
