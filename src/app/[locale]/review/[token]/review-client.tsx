"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { GuestGate } from "@/components/review/guest-gate";
import { registerGuest, createGuestComment, submitGuestDecision } from "@/lib/actions/guests";
import { getSignedUrl, getFileCategory } from "@/lib/storage";
import { AnnotationCanvas } from "@/components/annotations/annotation-canvas";
import { CommentPanel } from "@/components/annotations/comment-panel";
import { DrawingCanvas, DrawingCanvasHandle, DrawnShape } from "@/components/annotations/drawing-canvas";
import { PdfViewer } from "@/components/viewer/pdf-viewer";
import { ColorPicker } from "@/components/viewer/color-picker";
import { useToast } from "@/components/ui/toast-provider";

interface ReviewPageClientProps {
    proof: any;
    versions: any[];
    initialComments: any[];
    token: string;
    projectName: string;
}

interface GuestInfo {
    id: string;
    displayName: string;
    email?: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
    image: "IMAGE",
    video: "VIDEO",
    pdf: "PDF",
    design: "DESIGN",
    unknown: "FILE",
};

export function ReviewPageClient({ proof, versions, initialComments, token, projectName }: ReviewPageClientProps) {
    const { toast } = useToast();
    const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
    const [gateLoading, setGateLoading] = useState(false);
    const [gateError, setGateError] = useState<string | null>(null);

    // Check for stored guest session
    useEffect(() => {
        const stored = sessionStorage.getItem(`gp_guest_${token}`);
        if (stored) {
            try { setGuestInfo(JSON.parse(stored)); } catch { /* ignore */ }
        }
    }, [token]);

    const handleGuestRegister = async (displayName: string, email?: string) => {
        setGateLoading(true);
        setGateError(null);
        const { guest, error } = await registerGuest(token, displayName, email);
        if (error || !guest) {
            setGateError(error || "Erro ao registrar");
            setGateLoading(false);
            return;
        }
        setGuestInfo(guest);
        sessionStorage.setItem(`gp_guest_${token}`, JSON.stringify(guest));
        setGateLoading(false);
    };

    if (!guestInfo) {
        return (
            <GuestGate
                proofTitle={proof.title}
                onSubmit={handleGuestRegister}
                loading={gateLoading}
                error={gateError}
            />
        );
    }

    return (
        <GuestViewer
            proof={proof}
            versions={versions}
            initialComments={initialComments}
            guestInfo={guestInfo}
            projectName={projectName}
        />
    );
}

/* ─── Guest Viewer: Simplified proof viewer for external reviewers ─── */

interface GuestViewerProps {
    proof: any;
    versions: any[];
    initialComments: any[];
    guestInfo: GuestInfo;
    projectName: string;
}

function GuestViewer({ proof, versions, initialComments, guestInfo, projectName }: GuestViewerProps) {
    const { toast } = useToast();

    // Version state
    const [versionList] = useState<any[]>(versions);
    const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [zoom, setZoom] = useState(1);
    const [showVersionDropdown, setShowVersionDropdown] = useState(false);
    const [showZoomPresets, setShowZoomPresets] = useState(false);

    // UI state
    const [showSidebar, setShowSidebar] = useState(true);
    const [showDecisionMenu, setShowDecisionMenu] = useState(false);
    const [activeTool, setActiveTool] = useState<string>("pin");

    // Annotation state
    const [isAnnotating, setIsAnnotating] = useState(true);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [pendingPin, setPendingPin] = useState<{ posX: number; posY: number } | null>(null);
    const [comments, setComments] = useState<any[]>(initialComments);

    // Drawing state
    const [annotColor, setAnnotColor] = useState("#ef4444");
    const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [viewerSize, setViewerSize] = useState({ width: 800, height: 600 });
    const [drawingShapes, setDrawingShapes] = useState<DrawnShape[]>([]);

    // Video state
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoTime, setVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const decisionRef = useRef<HTMLDivElement>(null);
    const versionDropdownRef = useRef<HTMLDivElement>(null);

    const isLocked = !!proof.locked_at;

    // Close dropdowns on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (decisionRef.current && !decisionRef.current.contains(e.target as Node)) setShowDecisionMenu(false);
            if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) setShowVersionDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Track viewer container size
    useEffect(() => {
        const el = viewerContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) setViewerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Load signed URL
    useEffect(() => {
        if (selectedVersion?.file_url) getSignedUrl(selectedVersion.file_url).then(setFileUrl);
    }, [selectedVersion]);

    const fileCategory = selectedVersion ? getFileCategory(selectedVersion.file_type) : "unknown";

    const handleCanvasClick = useCallback((posX: number, posY: number) => {
        if (!isAnnotating) return;
        setPendingPin({ posX, posY });
        setShowSidebar(true);
        if (fileCategory === "video" && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isAnnotating, fileCategory]);

    const handleDecision = async (status: string) => {
        if (isLocked) { toast("Prova está travada", "error"); return; }
        const res = await submitGuestDecision(proof.id, status, guestInfo.id);
        if (res.error) { toast(res.error, "error"); return; }
        setShowDecisionMenu(false);
        toast(status === "approved" ? "Aprovado!" : `Decisão registrada: ${status.replace(/_/g, " ")}`, "success");
    };

    // Comments refresh
    const refreshComments = useCallback(async () => {
        // Guest comments refresh: re-fetch via the server
        // For simplicity, we'll use the version_id in a client-side fetch
        if (!selectedVersion?.id) return;
        try {
            const res = await fetch(`/api/proofs/comments?versionId=${selectedVersion.id}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch { /* silent */ }
    }, [selectedVersion]);

    // Pins
    const rootComments = comments.filter((c: any) => !c.parent_comment_id && c.pos_x != null && c.pos_y != null);
    const visibleRootComments = fileCategory === "video"
        ? rootComments.filter((c: any) => c.video_timestamp == null || Math.abs(c.video_timestamp - videoTime) < 1.0)
        : rootComments;
    const pins = visibleRootComments.map((c: any) => {
        const absoluteIndex = rootComments.findIndex((rc: any) => rc.id === c.id);
        return { id: c.id, number: absoluteIndex + 1, posX: c.pos_x, posY: c.pos_y, status: c.status as "open" | "resolved", preview: c.content.slice(0, 80) };
    });
    const allPins = pendingPin
        ? [...pins, { id: "pending", number: rootComments.length + 1, posX: pendingPin.posX, posY: pendingPin.posY, status: "open" as const, preview: "..." }]
        : pins;

    const openComments = comments.filter((c: any) => !c.parent_comment_id && c.status === "open").length;

    const drawingTools = [
        { id: "pin", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z", label: "Pin" },
        { id: "rect", icon: "M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-8.25A2.25 2.25 0 017.5 18v-2.25", label: "Retângulo" },
        { id: "circle", icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "Círculo" },
        { id: "arrow", icon: "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25", label: "Seta" },
        { id: "pen", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z", label: "Desenhar" },
    ];

    return (
        <div className="flex flex-col h-screen bg-[#1a1a2e] overflow-hidden">
            {/* ═══ HEADER BAR ═══ */}
            <header className="flex items-center h-[48px] px-4 border-b border-[#2a2a40] bg-[#1a1a2e] shrink-0 z-30">
                {/* LEFT */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Logo */}
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/20 shrink-0">
                        <Image
                            src="https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_38,h_30,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png"
                            alt="GP"
                            width={14}
                            height={11}
                            className="brightness-200"
                        />
                    </div>

                    <span className="text-[15px] font-semibold text-white truncate">{proof.title}</span>

                    <span className="text-[11px] font-bold text-zinc-400 bg-[#2a2a40] px-2 py-1 rounded-md tracking-wider shrink-0">
                        {FILE_TYPE_LABELS[fileCategory] || "FILE"}
                    </span>

                    {/* Version dropdown */}
                    <div className="relative" ref={versionDropdownRef}>
                        <button
                            onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300 hover:text-white bg-[#2a2a40] rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                        >
                            V.{selectedVersion?.version_number || 1}
                            <svg className="h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showVersionDropdown && versionList.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[160px] z-50">
                                {versionList.map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => { setSelectedVersion(v); setShowVersionDropdown(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors cursor-pointer ${selectedVersion?.id === v.id ? "text-blue-400 bg-blue-500/10" : "text-zinc-300 hover:bg-[#2a2a40]"}`}
                                    >
                                        <span className="font-mono font-bold">V.{v.version_number}</span>
                                        <span className="text-zinc-500 text-[11px]">
                                            {new Date(v.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Guest badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 ml-2">
                        <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span className="text-[11px] font-semibold text-indigo-400">{guestInfo.displayName}</span>
                    </div>
                </div>

                {/* CENTER: Decision */}
                <div className="relative" ref={decisionRef}>
                    <button
                        onClick={() => setShowDecisionMenu(!showDecisionMenu)}
                        disabled={isLocked}
                        className={`h-[36px] px-6 rounded-lg text-[14px] font-bold transition-all shadow-lg cursor-pointer ${isLocked
                            ? "bg-zinc-700 text-zinc-400 shadow-none cursor-not-allowed"
                            : "bg-[#1a8cff] hover:bg-[#0077ee] text-white shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02]"
                            }`}
                    >
                        {isLocked ? "Travada" : "Dar Parecer"}
                    </button>

                    {showDecisionMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1.5 min-w-[260px] z-50">
                            {[
                                { status: "approved", label: "Aprovar", dot: "bg-green-500" },
                                { status: "approved_with_changes", label: "Aprovar com ressalvas", dot: "bg-green-500" },
                                { status: "changes_requested", label: "Solicitar alterações", dot: "bg-amber-500" },
                                { status: "not_relevant", label: "Não se aplica a mim", dot: "bg-zinc-500" },
                                { status: "rejected", label: "Rejeitar", dot: "bg-red-600" },
                            ].map((opt) => (
                                <button
                                    key={opt.status}
                                    onClick={() => handleDecision(opt.status)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-zinc-300 hover:bg-[#2a2a40] cursor-pointer transition-colors"
                                >
                                    <span className={`h-3 w-3 rounded-full ${opt.dot}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: just the guest avatar */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-[11px] font-bold text-white">
                        {guestInfo.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                </div>
            </header>

            {/* ═══ SECONDARY TOOLBAR ═══ */}
            <div className="flex items-center h-[42px] px-3 border-b border-[#2a2a40] bg-[#1e1e32] shrink-0 gap-1.5">
                {/* Zoom */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>
                    </button>
                    <button onClick={() => setZoom(z => Math.min(z + 0.25, 5))} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" /></svg>
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowZoomPresets(!showZoomPresets)} className="text-[12px] text-zinc-400 hover:text-white font-mono px-2 py-1 hover:bg-[#2a2a40] rounded-lg transition-colors min-w-[48px] text-center cursor-pointer">
                            {Math.round(zoom * 100)} %
                        </button>
                        {showZoomPresets && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[120px] z-50">
                                {[25, 50, 75, 100, 150, 200, 300].map(pct => (
                                    <button key={pct} onClick={() => { setZoom(pct / 100); setShowZoomPresets(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${Math.round(zoom * 100) === pct ? "bg-blue-500/20 text-white" : "text-zinc-400 hover:bg-[#2a2a40]"}`}>
                                        {pct}%
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                {/* Drawing tools */}
                <div className="flex items-center gap-0.5">
                    {drawingTools.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${activeTool === tool.id ? "text-white bg-[#1a8cff]/20 ring-1 ring-[#1a8cff]/40" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"
                                }`}
                            title={tool.label}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                            </svg>
                        </button>
                    ))}
                </div>

                <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                <ColorPicker color={annotColor} onChange={setAnnotColor} />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Comment count + sidebar toggle */}
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`h-8 px-3 rounded-lg flex items-center gap-2 text-[12px] font-medium transition-colors cursor-pointer ${showSidebar ? "text-white bg-[#2a2a40]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    {openComments > 0 && <span className="text-amber-400">{openComments}</span>}
                </button>
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Viewer area */}
                <div ref={viewerContainerRef} className="flex-1 overflow-auto bg-[#15152a] relative flex items-center justify-center">
                    {!fileUrl ? (
                        <div className="text-center text-zinc-500">
                            <svg className="h-10 w-10 mx-auto mb-2 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <p className="text-[13px]">Carregando arquivo...</p>
                        </div>
                    ) : fileCategory === "pdf" ? (
                        <PdfViewer
                            fileUrl={fileUrl}
                            zoom={zoom}
                            pins={allPins}
                            isAnnotating={isAnnotating}
                            activePinId={activePinId}
                            activeTool={activeTool}
                            annotColor={annotColor}
                            drawingShapes={drawingShapes}
                            drawingCanvasRef={drawingCanvasRef}
                            viewerSize={viewerSize}
                            onPinClick={(id) => setActivePinId(id)}
                            onCanvasClick={handleCanvasClick}
                            onShapesChange={setDrawingShapes}
                        />
                    ) : fileCategory === "video" ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <video
                                ref={videoRef}
                                src={fileUrl}
                                className="max-w-full max-h-full"
                                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                                onTimeUpdate={() => videoRef.current && setVideoTime(videoRef.current.currentTime)}
                                onLoadedMetadata={() => videoRef.current && setVideoDuration(videoRef.current.duration)}
                                onClick={() => {
                                    if (videoRef.current) {
                                        if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
                                        else { videoRef.current.pause(); setIsPlaying(false); }
                                    }
                                }}
                            />
                            {isAnnotating && (
                                <AnnotationCanvas
                                    pins={allPins}
                                    isAnnotating={isAnnotating}
                                    activePinId={activePinId}
                                    onPinClick={(id) => setActivePinId(id)}
                                    onCanvasClick={handleCanvasClick}
                                />
                            )}
                            {activeTool !== "pin" && activeTool !== "select" && (
                                <DrawingCanvas
                                    ref={drawingCanvasRef}
                                    tool={activeTool as any}
                                    color={annotColor}
                                    containerWidth={viewerSize.width}
                                    containerHeight={viewerSize.height}
                                    onShapesChange={setDrawingShapes}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={fileUrl}
                                alt={proof.title}
                                className="max-w-full max-h-full object-contain select-none"
                                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                                draggable={false}
                            />
                            {isAnnotating && (
                                <AnnotationCanvas
                                    pins={allPins}
                                    isAnnotating={isAnnotating}
                                    activePinId={activePinId}
                                    onPinClick={(id) => setActivePinId(id)}
                                    onCanvasClick={handleCanvasClick}
                                />
                            )}
                            {activeTool !== "pin" && activeTool !== "select" && (
                                <DrawingCanvas
                                    ref={drawingCanvasRef}
                                    tool={activeTool as any}
                                    color={annotColor}
                                    containerWidth={viewerSize.width}
                                    containerHeight={viewerSize.height}
                                    onShapesChange={setDrawingShapes}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                {showSidebar && (
                    <div className="w-[340px] border-l border-[#2a2a40] bg-[#1a1a2e] overflow-y-auto shrink-0">
                        <CommentPanel
                            comments={comments}
                            versionId={selectedVersion?.id || ""}
                            proofId={proof.id}
                            currentUserId={`guest:${guestInfo.id}`}
                            pendingPin={pendingPin}
                            activePinId={activePinId}
                            onPinClick={(id) => setActivePinId(id)}
                            onCancelPin={() => setPendingPin(null)}
                            onCommentCreated={refreshComments}
                            isLocked={isLocked}
                            videoTimestamp={fileCategory === "video" ? videoTime : undefined}
                            isGuest={true}
                            guestInfo={guestInfo}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
