"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

export type ShapeType = "rect" | "circle" | "arrow" | "line" | "pen" | "text";

export interface DrawnShape {
    id: string;
    type: ShapeType;
    color: string;
    lineWidth: number;
    // For rect, circle
    x: number;
    y: number;
    width: number;
    height: number;
    // For line, arrow
    x2: number;
    y2: number;
    // For pen (freehand)
    points: { x: number; y: number }[];
    // For text
    text: string;
    fontSize: number;
    // Video timestamp (null = always visible, e.g. for images)
    timestamp: number | null;
    // Duration in seconds (how long the annotation is visible, default 4 = ±2s)
    duration: number;
}

export interface DrawingCanvasHandle {
    undo: () => void;
    redo: () => void;
    getShapes: () => DrawnShape[];
    clearAll: () => void;
    updateShape: (id: string, updates: Partial<DrawnShape>) => void;
}

interface DrawingCanvasProps {
    tool: ShapeType | "select" | "pin" | null;
    color: string;
    lineWidth?: number;
    fontSize?: number;
    containerWidth: number;
    containerHeight: number;
    videoTimestamp?: number | null; // null = image mode (always show), number = current video time
    onShapesChange?: (shapes: DrawnShape[]) => void;
}

function generateId() {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
    function DrawingCanvas({ tool, color, lineWidth = 2, fontSize = 16, containerWidth, containerHeight, videoTimestamp, onShapesChange }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [shapes, setShapes] = useState<DrawnShape[]>([]);
        const [undoStack, setUndoStack] = useState<DrawnShape[][]>([]);
        const [redoStack, setRedoStack] = useState<DrawnShape[][]>([]);
        const [isDrawing, setIsDrawing] = useState(false);
        const [currentShape, setCurrentShape] = useState<DrawnShape | null>(null);
        const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
        const [textValue, setTextValue] = useState("");
        const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
        const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

        const saveToHistory = useCallback((prevShapes: DrawnShape[]) => {
            setUndoStack((prev) => [...prev.slice(-30), prevShapes]);
            setRedoStack([]);
        }, []);

        const undo = useCallback(() => {
            if (undoStack.length === 0) return;
            const prev = undoStack[undoStack.length - 1];
            setRedoStack((r) => [...r, shapes]);
            setShapes(prev);
            setUndoStack((u) => u.slice(0, -1));
            onShapesChange?.(prev);
        }, [undoStack, shapes, onShapesChange]);

        const redo = useCallback(() => {
            if (redoStack.length === 0) return;
            const next = redoStack[redoStack.length - 1];
            setUndoStack((u) => [...u, shapes]);
            setShapes(next);
            setRedoStack((r) => r.slice(0, -1));
            onShapesChange?.(next);
        }, [redoStack, shapes, onShapesChange]);

        useImperativeHandle(ref, () => ({
            undo,
            redo,
            getShapes: () => shapes,
            clearAll: () => { saveToHistory(shapes); setShapes([]); onShapesChange?.([]); },
            updateShape: (id: string, updates: Partial<DrawnShape>) => {
                saveToHistory(shapes);
                const newShapes = shapes.map(s => s.id === id ? { ...s, ...updates } : s);
                setShapes(newShapes);
                onShapesChange?.(newShapes);
            },
        }), [undo, redo, shapes, saveToHistory, onShapesChange]);

        // Redraw canvas on changes
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = containerWidth;
            canvas.height = containerHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const visibleShapes = shapes.filter((s) => {
                if (s.timestamp == null || videoTimestamp == null) return true;
                return Math.abs(s.timestamp - videoTimestamp) < (s.duration / 2);
            });

            const allShapes = currentShape ? [...visibleShapes, currentShape] : visibleShapes;
            for (const shape of allShapes) {
                ctx.strokeStyle = shape.color;
                ctx.fillStyle = shape.color;
                ctx.lineWidth = shape.lineWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                const isSelected = selectedShapeId === shape.id;
                if (isSelected) {
                    ctx.shadowColor = shape.color;
                    ctx.shadowBlur = 6;
                }

                switch (shape.type) {
                    case "rect":
                        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                        break;
                    case "circle": {
                        const rx = Math.abs(shape.width) / 2;
                        const ry = Math.abs(shape.height) / 2;
                        const cx = shape.x + shape.width / 2;
                        const cy = shape.y + shape.height / 2;
                        ctx.beginPath();
                        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                        ctx.stroke();
                        break;
                    }
                    case "line":
                        ctx.beginPath();
                        ctx.moveTo(shape.x, shape.y);
                        ctx.lineTo(shape.x2, shape.y2);
                        ctx.stroke();
                        break;
                    case "arrow": {
                        ctx.beginPath();
                        ctx.moveTo(shape.x, shape.y);
                        ctx.lineTo(shape.x2, shape.y2);
                        ctx.stroke();
                        // Arrowhead
                        const angle = Math.atan2(shape.y2 - shape.y, shape.x2 - shape.x);
                        const headLen = 12;
                        ctx.beginPath();
                        ctx.moveTo(shape.x2, shape.y2);
                        ctx.lineTo(shape.x2 - headLen * Math.cos(angle - Math.PI / 6), shape.y2 - headLen * Math.sin(angle - Math.PI / 6));
                        ctx.moveTo(shape.x2, shape.y2);
                        ctx.lineTo(shape.x2 - headLen * Math.cos(angle + Math.PI / 6), shape.y2 - headLen * Math.sin(angle + Math.PI / 6));
                        ctx.stroke();
                        break;
                    }
                    case "pen":
                        if (shape.points.length < 2) break;
                        ctx.beginPath();
                        ctx.moveTo(shape.points[0].x, shape.points[0].y);
                        for (let i = 1; i < shape.points.length; i++) {
                            ctx.lineTo(shape.points[i].x, shape.points[i].y);
                        }
                        ctx.stroke();
                        break;
                    case "text":
                        ctx.font = `${shape.fontSize}px Inter, system-ui, sans-serif`;
                        ctx.fillText(shape.text, shape.x, shape.y);
                        break;
                }

                ctx.shadowBlur = 0;

                // Draw selection indicator (dashed box + corner handles)
                if (isSelected) {
                    let bx = shape.x, by = shape.y, bw = 0, bh = 0;
                    switch (shape.type) {
                        case "rect":
                            bx = shape.x; by = shape.y; bw = shape.width; bh = shape.height;
                            break;
                        case "circle":
                            bx = shape.x; by = shape.y; bw = shape.width; bh = shape.height;
                            break;
                        case "line":
                        case "arrow":
                            bx = Math.min(shape.x, shape.x2) - 4; by = Math.min(shape.y, shape.y2) - 4;
                            bw = Math.abs(shape.x2 - shape.x) + 8; bh = Math.abs(shape.y2 - shape.y) + 8;
                            break;
                        case "pen":
                            if (shape.points.length > 0) {
                                const xs = shape.points.map(p => p.x);
                                const ys = shape.points.map(p => p.y);
                                bx = Math.min(...xs) - 4; by = Math.min(...ys) - 4;
                                bw = Math.max(...xs) - bx + 8; bh = Math.max(...ys) - by + 8;
                            }
                            break;
                        case "text":
                            bw = shape.text.length * shape.fontSize * 0.6;
                            bh = shape.fontSize;
                            by = shape.y - shape.fontSize;
                            break;
                    }
                    // Dashed border
                    ctx.save();
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = "#5aa0e9";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);
                    ctx.setLineDash([]);
                    // Corner handles
                    const hs = 5;
                    ctx.fillStyle = "#5aa0e9";
                    for (const [cx, cy] of [[bx - 4, by - 4], [bx + bw + 4, by - 4], [bx - 4, by + bh + 4], [bx + bw + 4, by + bh + 4]]) {
                        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
                    }
                    ctx.restore();
                }
            }
        }, [shapes, currentShape, containerWidth, containerHeight, selectedShapeId, videoTimestamp]);

        const getCanvasPos = (e: React.MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const findShapeAt = (x: number, y: number): DrawnShape | null => {
            for (let i = shapes.length - 1; i >= 0; i--) {
                const s = shapes[i];
                const margin = 8;
                switch (s.type) {
                    case "rect":
                        if (x >= s.x - margin && x <= s.x + s.width + margin && y >= s.y - margin && y <= s.y + s.height + margin) return s;
                        break;
                    case "circle": {
                        const cx = s.x + s.width / 2;
                        const cy = s.y + s.height / 2;
                        const rx = Math.abs(s.width) / 2 + margin;
                        const ry = Math.abs(s.height) / 2 + margin;
                        if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) return s;
                        break;
                    }
                    case "line":
                    case "arrow": {
                        const dist = distToSegment(x, y, s.x, s.y, s.x2, s.y2);
                        if (dist < margin + 4) return s;
                        break;
                    }
                    case "pen": {
                        for (let j = 1; j < s.points.length; j++) {
                            if (distToSegment(x, y, s.points[j - 1].x, s.points[j - 1].y, s.points[j].x, s.points[j].y) < margin + 4) return s;
                        }
                        break;
                    }
                    case "text": {
                        const tw = s.text.length * s.fontSize * 0.6;
                        if (x >= s.x - margin && x <= s.x + tw + margin && y >= s.y - s.fontSize - margin && y <= s.y + margin) return s;
                        break;
                    }
                }
            }
            return null;
        };

        const handleMouseDown = (e: React.MouseEvent) => {
            if (!tool || tool === "pin") return;
            const pos = getCanvasPos(e);

            if (tool === "select") {
                const hit = findShapeAt(pos.x, pos.y);
                setSelectedShapeId(hit?.id || null);
                if (hit) {
                    setDragOffset({ x: pos.x - hit.x, y: pos.y - hit.y });
                    setIsDrawing(true);
                }
                return;
            }

            if (tool === "text") {
                setTextInput({ x: pos.x, y: pos.y, visible: true });
                setTextValue("");
                return;
            }

            setIsDrawing(true);
            const newShape: DrawnShape = {
                id: generateId(),
                type: tool as ShapeType,
                color,
                lineWidth,
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
                x2: pos.x,
                y2: pos.y,
                points: tool === "pen" ? [{ x: pos.x, y: pos.y }] : [],
                text: "",
                fontSize,
                timestamp: videoTimestamp ?? null,
                duration: 4,
            };
            setCurrentShape(newShape);
        };

        const handleMouseMove = (e: React.MouseEvent) => {
            if (!isDrawing) return;
            const pos = getCanvasPos(e);

            if (tool === "select" && selectedShapeId && dragOffset) {
                setShapes((prev) =>
                    prev.map((s) => {
                        if (s.id !== selectedShapeId) return s;
                        const dx = pos.x - dragOffset.x - s.x;
                        const dy = pos.y - dragOffset.y - s.y;
                        return {
                            ...s,
                            x: s.x + dx,
                            y: s.y + dy,
                            x2: s.x2 + dx,
                            y2: s.y2 + dy,
                            points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                        };
                    })
                );
                setDragOffset({ x: pos.x - (shapes.find(s => s.id === selectedShapeId)?.x || 0), y: pos.y - (shapes.find(s => s.id === selectedShapeId)?.y || 0) });
                return;
            }

            if (!currentShape) return;

            setCurrentShape((prev) => {
                if (!prev) return null;
                switch (prev.type) {
                    case "rect":
                    case "circle":
                        return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
                    case "line":
                    case "arrow":
                        return { ...prev, x2: pos.x, y2: pos.y };
                    case "pen":
                        return { ...prev, points: [...prev.points, { x: pos.x, y: pos.y }] };
                    default:
                        return prev;
                }
            });
        };

        const handleMouseUp = () => {
            if (!isDrawing) return;
            setIsDrawing(false);

            if (tool === "select") {
                setDragOffset(null);
                return;
            }

            if (currentShape) {
                const minSize = currentShape.type === "pen" ? 0 : 3;
                const isValid =
                    currentShape.type === "pen"
                        ? currentShape.points.length > 2
                        : currentShape.type === "line" || currentShape.type === "arrow"
                            ? Math.abs(currentShape.x2 - currentShape.x) + Math.abs(currentShape.y2 - currentShape.y) > minSize
                            : Math.abs(currentShape.width) + Math.abs(currentShape.height) > minSize;

                if (isValid) {
                    saveToHistory(shapes);
                    const newShapes = [...shapes, currentShape];
                    setShapes(newShapes);
                    onShapesChange?.(newShapes);
                }
            }
            setCurrentShape(null);
        };

        const handleTextSubmit = () => {
            if (!textValue.trim()) {
                setTextInput({ x: 0, y: 0, visible: false });
                return;
            }
            saveToHistory(shapes);
            const newShape: DrawnShape = {
                id: generateId(),
                type: "text",
                color,
                lineWidth,
                x: textInput.x,
                y: textInput.y,
                width: 0,
                height: 0,
                x2: 0,
                y2: 0,
                points: [],
                text: textValue,
                fontSize,
                timestamp: videoTimestamp ?? null,
                duration: 4,
            };
            const newShapes = [...shapes, newShape];
            setShapes(newShapes);
            onShapesChange?.(newShapes);
            setTextInput({ x: 0, y: 0, visible: false });
            setTextValue("");
        };

        // Keyboard: Delete selected
        useEffect(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === "Delete" || e.key === "Backspace") {
                    if (selectedShapeId && tool === "select") {
                        const target = e.target as HTMLElement;
                        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
                        saveToHistory(shapes);
                        const newShapes = shapes.filter((s) => s.id !== selectedShapeId);
                        setShapes(newShapes);
                        setSelectedShapeId(null);
                        onShapesChange?.(newShapes);
                    }
                }
            };
            window.addEventListener("keydown", handleKey);
            return () => window.removeEventListener("keydown", handleKey);
        }, [selectedShapeId, tool, shapes, saveToHistory, onShapesChange]);

        const isDrawTool = tool && !["select", "pin"].includes(tool);

        return (
            <div className="absolute inset-0" style={{ pointerEvents: isDrawTool || tool === "select" ? "auto" : "none" }}>
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 ${isDrawTool ? "cursor-crosshair" : tool === "select" ? "cursor-default" : ""}`}
                    style={{ width: containerWidth, height: containerHeight }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
                {/* Inline text input */}
                {textInput.visible && (
                    <input
                        autoFocus
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") setTextInput({ x: 0, y: 0, visible: false }); }}
                        onBlur={handleTextSubmit}
                        className="absolute bg-transparent border-b-2 border-current text-white font-sans outline-none min-w-[100px]"
                        style={{ left: textInput.x, top: textInput.y - fontSize, fontSize, color }}
                    />
                )}
            </div>
        );
    }
);

// Utility: distance from point to line segment
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
