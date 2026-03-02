"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnnotationCanvas } from "@/components/annotations/annotation-canvas";
import { DrawingCanvas, DrawingCanvasHandle, DrawnShape } from "@/components/annotations/drawing-canvas";

interface AnnotationPin {
    id: string;
    number: number;
    posX: number;
    posY: number;
    status: "open" | "resolved";
    preview: string;
}

interface PdfViewerProps {
    fileUrl: string;
    zoom: number;
    pins: AnnotationPin[];
    isAnnotating: boolean;
    activePinId: string | null;
    activeTool: string;
    annotColor: string;
    drawingShapes: DrawnShape[];
    drawingCanvasRef: React.RefObject<DrawingCanvasHandle | null>;
    viewerSize: { width: number; height: number };
    onPinClick: (pinId: string) => void;
    onCanvasClick: (posX: number, posY: number) => void;
    onShapesChange: (shapes: DrawnShape[]) => void;
}

export function PdfViewer({
    fileUrl,
    zoom,
    pins,
    isAnnotating,
    activePinId,
    activeTool,
    annotColor,
    drawingShapes,
    drawingCanvasRef,
    viewerSize,
    onPinClick,
    onCanvasClick,
    onShapesChange,
}: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageImgUrl, setPageImgUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    // Load PDF document
    useEffect(() => {
        if (!fileUrl) return;
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const pdfjsLib = await import("pdfjs-dist");

                // Configure worker
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                }

                const loadingTask = pdfjsLib.getDocument(fileUrl);
                const doc = await loadingTask.promise;
                if (cancelled) return;
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                setPageNum(1);
            } catch (err: any) {
                if (!cancelled) setError(err?.message || "Erro ao carregar PDF");
            }
        })();

        return () => { cancelled = true; };
    }, [fileUrl]);

    // Render current page to canvas → image
    const renderPage = useCallback(async (doc: any, num: number) => {
        if (!doc || !canvasRef.current) return;
        try {
            setLoading(true);
            const page = await doc.getPage(num);
            const scale = 2; // Render at 2x for sharpness
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Convert to image URL
            const url = canvas.toDataURL("image/png");
            setPageImgUrl(url);
            setDims({ w: viewport.width / scale, h: viewport.height / scale });
            setLoading(false);
        } catch (err: any) {
            setError(err?.message || "Erro ao renderizar página");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (pdfDoc && pageNum > 0) {
            renderPage(pdfDoc, pageNum);
        }
    }, [pdfDoc, pageNum, renderPage]);

    const goToPrev = () => setPageNum(p => Math.max(1, p - 1));
    const goToNext = () => setPageNum(p => Math.min(totalPages, p + 1));

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <p className="text-[13px] text-zinc-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            {/* Hidden canvas for rendering */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Page navigation bar */}
            {totalPages > 1 && (
                <div className="flex items-center gap-2 mb-3 bg-[#1e1e32] border border-[#3a3a55] rounded-lg px-3 py-1.5 shadow-lg z-20">
                    <button
                        onClick={goToPrev}
                        disabled={pageNum <= 1}
                        className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#2a2a40] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <span className="text-[12px] font-mono text-zinc-300 min-w-[80px] text-center">
                        {pageNum} / {totalPages}
                    </span>
                    <button
                        onClick={goToNext}
                        disabled={pageNum >= totalPages}
                        className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#2a2a40] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
            )}

            {/* PDF page rendered as image with annotation overlays */}
            {loading ? (
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-[11px] text-zinc-500 font-mono">Renderizando página {pageNum}...</span>
                </div>
            ) : pageImgUrl ? (
                <div
                    style={{ transform: `scale(${zoom})`, width: dims.w, height: dims.h }}
                    className="transition-transform duration-200 relative"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={pageImgUrl}
                        alt={`Página ${pageNum}`}
                        className="w-full h-full shadow-2xl rounded"
                        draggable={false}
                    />

                    {/* Annotation pins overlay */}
                    <AnnotationCanvas
                        pins={pins}
                        isAnnotating={isAnnotating}
                        activePinId={activePinId}
                        onPinClick={onPinClick}
                        onCanvasClick={onCanvasClick}
                    />

                    {/* Drawing shapes overlay */}
                    {activeTool !== "pin" && activeTool !== "select" && (
                        <DrawingCanvas
                            ref={drawingCanvasRef}
                            tool={activeTool as any}
                            color={annotColor}
                            containerWidth={dims.w}
                            containerHeight={dims.h}
                            onShapesChange={onShapesChange}
                        />
                    )}

                    {/* Render existing shapes when in pin/select mode */}
                    {drawingShapes.length > 0 && (activeTool === "pin" || activeTool === "select") && (
                        <DrawingCanvas
                            ref={drawingCanvasRef}
                            tool="select"
                            color={annotColor}
                            containerWidth={dims.w}
                            containerHeight={dims.h}
                            onShapesChange={onShapesChange}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
}
