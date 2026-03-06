"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface LogoCropperProps {
    onUpload: (file: File) => Promise<void>;
    currentLogoUrl?: string | null;
}

export function LogoCropper({ onUpload, currentLogoUrl }: LogoCropperProps) {
    const [image, setImage] = useState<string | null>(null);
    const [cropping, setCropping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 200 });
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImage(ev.target?.result as string);
            setCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const handleImageLoad = useCallback(() => {
        if (!imgRef.current || !containerRef.current) return;
        const container = containerRef.current.getBoundingClientRect();
        const img = imgRef.current;
        const scale = Math.min(container.width / img.naturalWidth, container.height / img.naturalHeight, 1);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        setImgDims({ w, h });
        const size = Math.min(w, h, 200);
        setCropArea({ x: (w - size) / 2, y: (h - size) / 2, size });
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - cropArea.x, y: e.clientY - cropArea.y };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const x = Math.max(0, Math.min(e.clientX - dragStart.current.x, imgDims.w - cropArea.size));
        const y = Math.max(0, Math.min(e.clientY - dragStart.current.y, imgDims.h - cropArea.size));
        setCropArea(prev => ({ ...prev, x, y }));
    }, [imgDims, cropArea.size]);

    const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

    useEffect(() => {
        if (cropping) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [cropping, handleMouseMove, handleMouseUp]);

    const handleCrop = async () => {
        if (!imgRef.current || !canvasRef.current) return;
        setUploading(true);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = imgRef.current;
        const container = containerRef.current!.getBoundingClientRect();
        const scale = Math.min(container.width / img.naturalWidth, container.height / img.naturalHeight, 1);

        // Map crop coords back to original image space
        const srcX = cropArea.x / scale;
        const srcY = cropArea.y / scale;
        const srcSize = cropArea.size / scale;

        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 400, 400);

        canvas.toBlob(async (blob) => {
            if (!blob) { setUploading(false); return; }
            const file = new File([blob], "logo.png", { type: "image/png" });
            await onUpload(file);
            setUploading(false);
            setCropping(false);
            setImage(null);
        }, "image/png");
    };

    const handleCancel = () => {
        setCropping(false);
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Current logo or upload zone */}
            {!cropping && (
                <div className="group flex items-center gap-5 pt-2 pb-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative h-16 w-16 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ring-1 ring-zinc-800 hover:ring-emerald-500/50 hover:bg-zinc-800"
                    >
                        {currentLogoUrl ? (
                            <>
                                <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                    <span className="text-[10px] font-bold tracking-wider text-white uppercase">Trocar</span>
                                </div>
                            </>
                        ) : (
                            <svg className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        )}
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[14px] font-semibold text-zinc-100 tracking-tight">
                            Sua Logo
                        </span>
                        <span className="text-[12px] text-zinc-500 mt-0.5">
                            Recomendado: 400x400px (Máx 2MB)
                        </span>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors mt-2 uppercase tracking-wider text-left w-fit"
                        >
                            {currentLogoUrl ? "Atualizar logo →" : "Fazer upload →"}
                        </button>
                    </div>
                </div>
            )}

            {/* Crop modal */}
            {cropping && image && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold text-white">Recortar Logo</h3>
                            <button type="button" onClick={handleCancel} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <div
                                ref={containerRef}
                                className="relative w-full h-[300px] bg-zinc-900/80 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-800/40"
                                style={{ userSelect: "none" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    ref={imgRef}
                                    src={image}
                                    alt="Preview"
                                    onLoad={handleImageLoad}
                                    className="max-w-full max-h-full"
                                    draggable={false}
                                    style={{ position: "absolute", left: `calc(50% - ${imgDims.w / 2}px)`, top: `calc(50% - ${imgDims.h / 2}px)` }}
                                />

                                {/* Dark overlay */}
                                <div className="absolute inset-0 bg-black/50 pointer-events-none" />

                                {/* Crop window */}
                                <div
                                    onMouseDown={handleMouseDown}
                                    className="absolute border-2 border-white rounded-xl cursor-move shadow-lg"
                                    style={{
                                        left: `calc(50% - ${imgDims.w / 2}px + ${cropArea.x}px)`,
                                        top: `calc(50% - ${imgDims.h / 2}px + ${cropArea.y}px)`,
                                        width: `${cropArea.size}px`,
                                        height: `${cropArea.size}px`,
                                        background: "transparent",
                                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                                    }}
                                >
                                    {/* Corner handles */}
                                    {["top-left", "top-right", "bottom-left", "bottom-right"].map(pos => (
                                        <div
                                            key={pos}
                                            className="absolute h-3 w-3 bg-white rounded-full border border-zinc-400"
                                            style={{
                                                top: pos.includes("top") ? -6 : undefined,
                                                bottom: pos.includes("bottom") ? -6 : undefined,
                                                left: pos.includes("left") ? -6 : undefined,
                                                right: pos.includes("right") ? -6 : undefined,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Size slider */}
                            <div className="mt-4 flex items-center gap-3">
                                <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                                </svg>
                                <input
                                    type="range"
                                    min={60}
                                    max={Math.min(imgDims.w, imgDims.h, 300)}
                                    value={cropArea.size}
                                    onChange={(e) => {
                                        const size = parseInt(e.target.value);
                                        setCropArea(prev => ({
                                            ...prev,
                                            size,
                                            x: Math.min(prev.x, imgDims.w - size),
                                            y: Math.min(prev.y, imgDims.h - size),
                                        }));
                                    }}
                                    className="flex-1 h-2 rounded-full appearance-none bg-zinc-800 cursor-pointer"
                                />
                                <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                </svg>
                            </div>
                        </div>

                        <div className="px-6 pb-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="h-10 px-4 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCrop}
                                disabled={uploading}
                                className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Aplicar Logo"
                                )}
                            </button>
                        </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}
        </div>
    );
}
