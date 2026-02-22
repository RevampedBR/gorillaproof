"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { UploadDropzone } from "@/components/upload/dropzone";
import { AnnotationCanvas } from "@/components/annotations/annotation-canvas";
import { CommentPanel } from "@/components/annotations/comment-panel";
import { getSignedUrl, getFileCategory } from "@/lib/storage";
import { getComments } from "@/lib/actions/comments";
import { updateProofStatus } from "@/lib/actions/proofs";

interface ProofViewerProps {
    proof: any;
    versions: any[];
    initialComments: any[];
    projectName: string;
    orgId: string;
    currentUserId: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
    image: "IMAGE",
    video: "VIDEO",
    pdf: "PDF",
    design: "DESIGN",
    unknown: "FILE",
};

export function ProofViewer({ proof, versions, initialComments, projectName, orgId, currentUserId }: ProofViewerProps) {
    const t = useTranslations("dashboard.viewer");
    const tp = useTranslations("dashboard.projects");
    const router = useRouter();

    // Version state
    const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [showUploadZone, setShowUploadZone] = useState(versions.length === 0);
    const [compareMode, setCompareMode] = useState(false);
    const [compareVersion, setCompareVersion] = useState<any>(versions[1] || null);
    const [compareUrl, setCompareUrl] = useState<string>("");
    const [zoom, setZoom] = useState(1);

    // UI state
    const [showDecisionMenu, setShowDecisionMenu] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showVersionDropdown, setShowVersionDropdown] = useState(false);
    const [activeTool, setActiveTool] = useState<string>("pin");

    // Annotation state
    const [isAnnotating, setIsAnnotating] = useState(true);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [pendingPin, setPendingPin] = useState<{ posX: number; posY: number } | null>(null);
    const [comments, setComments] = useState<any[]>(initialComments);

    // Video state
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoTime, setVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Refs for click outside
    const decisionRef = useRef<HTMLDivElement>(null);
    const versionDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (decisionRef.current && !decisionRef.current.contains(e.target as Node)) {
                setShowDecisionMenu(false);
            }
            if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
                setShowVersionDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Load signed URL
    useEffect(() => {
        if (selectedVersion?.file_url) {
            getSignedUrl(selectedVersion.file_url).then(setFileUrl);
        }
    }, [selectedVersion]);

    // Load compare URL
    useEffect(() => {
        if (compareMode && compareVersion?.file_url) {
            getSignedUrl(compareVersion.file_url).then(setCompareUrl);
        }
    }, [compareMode, compareVersion]);

    // Refresh comments on version change
    useEffect(() => {
        if (selectedVersion?.id) {
            getComments(selectedVersion.id).then(({ data }) => setComments(data));
        }
    }, [selectedVersion]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

            if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 5));
            if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.25));
            if (e.key === "0") setZoom(1);
            if (e.key === "a") setIsAnnotating((v) => !v);
            if (e.key === "Escape") { setShowDecisionMenu(false); setShowVersionDropdown(false); }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    const fileCategory = selectedVersion ? getFileCategory(selectedVersion.file_type) : "unknown";

    const handleUploadComplete = useCallback(() => {
        router.refresh();
        setShowUploadZone(false);
    }, [router]);

    const refreshComments = useCallback(async () => {
        if (selectedVersion?.id) {
            const { data } = await getComments(selectedVersion.id);
            setComments(data);
        }
    }, [selectedVersion]);

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
        await updateProofStatus(proof.id, status, proof.project_id);
        setShowDecisionMenu(false);
        router.refresh();
    };

    // Video controls
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
        else { videoRef.current.pause(); setIsPlaying(false); }
    };
    const stepFrame = (dir: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime += dir * (1 / 30);
    };
    const cycleSpeed = () => {
        const speeds = [0.5, 1, 1.5, 2];
        const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(next);
        if (videoRef.current) videoRef.current.playbackRate = next;
    };
    const formatTimestamp = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
    };

    // Build pins
    const rootComments = comments.filter((c: any) => !c.parent_comment_id && c.pos_x != null && c.pos_y != null);
    const visibleRootComments = fileCategory === "video"
        ? rootComments.filter((c: any) => c.video_timestamp == null || Math.abs(c.video_timestamp - videoTime) < 1.0)
        : rootComments;
    const pins = visibleRootComments.map((c: any) => {
        const absoluteIndex = rootComments.findIndex((rc: any) => rc.id === c.id);
        return {
            id: c.id, number: absoluteIndex + 1, posX: c.pos_x, posY: c.pos_y,
            status: c.status as "open" | "resolved", preview: c.content.slice(0, 80),
        };
    });
    const allPins = pendingPin
        ? [...pins, { id: "pending", number: rootComments.length + 1, posX: pendingPin.posX, posY: pendingPin.posY, status: "open" as const, preview: "..." }]
        : pins;
    const videoBookmarks = comments.filter((c: any) => !c.parent_comment_id && c.video_timestamp != null);
    const openComments = comments.filter((c: any) => !c.parent_comment_id && c.status === "open").length;

    /* ─────────────── DRAWING TOOLS CONFIG ─────────────── */
    const drawingTools = [
        { id: "select", icon: "M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59", label: "Select" },
        { id: "pin", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z", label: "Pin" },
        { id: "rect", icon: "M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-8.25A2.25 2.25 0 017.5 18v-2.25", label: "Rectangle" },
        { id: "circle", icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "Circle" },
        { id: "arrow", icon: "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25", label: "Arrow" },
        { id: "line", icon: "M4.5 19.5l15-15", label: "Line" },
        { id: "pen", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z", label: "Draw" },
    ];

    return (
        <div className="flex flex-col h-screen bg-[#1a1a2e]">
            {/* ═══════════════════════════════════════════════════
                ROW 1: HEADER BAR (matches Ziflow exactly)
                ☰ Title [TYPE] V.2▾ [compare]  →  Make decision  →  Share [avatar]
            ═══════════════════════════════════════════════════ */}
            <header className="flex items-center h-[48px] px-4 border-b border-[#2a2a40] bg-[#1a1a2e] shrink-0 z-30">
                {/* LEFT */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Link
                        href={`/projects/${proof.project_id}`}
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors shrink-0"
                        title="Back to project"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </Link>

                    <span className="text-[15px] font-semibold text-white truncate">{proof.title}</span>

                    {/* File type badge */}
                    <span className="text-[11px] font-bold text-zinc-400 bg-[#2a2a40] px-2 py-1 rounded-md tracking-wider shrink-0">
                        {FILE_TYPE_LABELS[fileCategory] || "FILE"}
                    </span>

                    {/* Version dropdown */}
                    <div className="relative" ref={versionDropdownRef}>
                        <button
                            onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300 hover:text-white bg-[#2a2a40] rounded-lg px-3 py-1.5 transition-colors"
                        >
                            V.{selectedVersion?.version_number || 1}
                            <svg className="h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showVersionDropdown && versions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[160px] z-50">
                                {versions.map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => { setSelectedVersion(v); setShowVersionDropdown(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors ${selectedVersion?.id === v.id ? "text-blue-400 bg-blue-500/10" : "text-zinc-300 hover:bg-[#2a2a40]"
                                            }`}
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

                    {/* Compare toggle */}
                    {versions.length > 1 && (
                        <button
                            onClick={() => setCompareMode(!compareMode)}
                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${compareMode ? "text-blue-400 bg-blue-500/15" : "text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2a40]"
                                }`}
                            title="Compare versions side-by-side"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* CENTER: Make Decision */}
                <div className="relative" ref={decisionRef}>
                    <button
                        onClick={() => setShowDecisionMenu(!showDecisionMenu)}
                        className="h-[36px] px-6 rounded-lg text-[14px] font-bold bg-[#1a8cff] hover:bg-[#0077ee] text-white transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02]"
                    >
                        {t("makeDecision")}
                    </button>

                    {showDecisionMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1.5 min-w-[260px] z-50">
                            {[
                                { status: "in_review", label: t("decisionPending"), dot: "bg-green-500", active: true },
                                { status: "approved", label: t("decisionApproved"), dot: "bg-green-500", active: false },
                                { status: "approved_with_changes", label: t("decisionApprovedChanges"), dot: "bg-green-500", active: false },
                                { status: "changes_requested", label: t("decisionChanges"), dot: "bg-red-500", active: false },
                                { status: "not_relevant", label: t("decisionNotRelevant"), dot: "bg-zinc-500", active: false },
                            ].map((opt) => (
                                <button
                                    key={opt.status}
                                    onClick={() => handleDecision(opt.status)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${proof.status === opt.status
                                        ? "bg-blue-500/20 text-white"
                                        : "text-zinc-300 hover:bg-[#2a2a40]"
                                        }`}
                                >
                                    <span className={`h-4 w-4 rounded-full border-2 ${proof.status === opt.status ? "border-green-400 bg-green-500" : `border-zinc-600 ${opt.dot}`} flex items-center justify-center`}>
                                        {proof.status === opt.status && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        )}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                            <div className="border-t border-[#3a3a55] mt-1.5 pt-1.5 mx-2">
                                <label className="flex items-center gap-2 px-2 py-2 text-[12px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                                    <input type="checkbox" className="rounded border-zinc-600 bg-transparent" />
                                    Send me an email confirmation
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Share + Avatar */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <button className="h-[36px] px-4 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors flex items-center gap-2" title="Share this proof">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        Share
                    </button>
                    {/* User avatar */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white" title="Your profile">
                        {currentUserId?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════
                ROW 2: SECONDARY TOOLBAR
                Left: Zoom controls + Fit/crop
                Right: Undo/Redo + Drawing tools + T + Color + Comment toggle + Sidebar
            ═══════════════════════════════════════════════════ */}
            <div className="flex items-center h-[42px] px-3 border-b border-[#2a2a40] bg-[#1e1e32] shrink-0 gap-1.5">
                {/* LEFT: Zoom */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Zoom out (-)">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                        </svg>
                    </button>
                    <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Zoom in (+)">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                    </button>
                    <button onClick={() => setZoom(1)} className="text-[12px] text-zinc-400 hover:text-white font-mono px-2 py-1 hover:bg-[#2a2a40] rounded-lg transition-colors min-w-[48px] text-center" title="Reset to 100% (0)">
                        {Math.round(zoom * 100)} %
                    </button>
                </div>

                <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                {/* Fit/Crop icons */}
                <button onClick={() => setZoom(1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Fit to screen">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </button>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Crop / Focus area">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
                    </svg>
                </button>

                {/* SPACER */}
                <div className="flex-1" />

                {/* RIGHT: Drawing tools (Ziflow puts these on the right side of row 2) */}
                {(fileCategory === "image" || fileCategory === "video") && (
                    <>
                        {/* Undo / Redo */}
                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors" title="Undo (Ctrl+Z)">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        </button>
                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors" title="Redo (Ctrl+Shift+Z)">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                        </button>

                        <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                        {drawingTools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id);
                                    if (tool.id === "pin") setIsAnnotating(true);
                                    else if (tool.id === "select") setIsAnnotating(false);
                                }}
                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${activeTool === tool.id
                                    ? "text-white bg-[#3a3a55]"
                                    : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"
                                    }`}
                                title={tool.label}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                                </svg>
                            </button>
                        ))}

                        <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                        {/* Text */}
                        <button
                            onClick={() => setActiveTool("text")}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-[15px] transition-colors ${activeTool === "text" ? "text-white bg-[#3a3a55]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                            title="Add text annotation"
                        >
                            T
                        </button>

                        {/* Color */}
                        <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a40] transition-colors" title="Change annotation color">
                            <div className="h-5 w-5 rounded-full bg-red-500 ring-2 ring-[#3a3a55]" />
                        </button>

                        {/* Sidebar layout toggle */}
                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Change layout">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                        </button>
                    </>
                )}

                <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                {/* Comment toggle (Ziflow puts this at far right of row 2) */}
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-colors ${showSidebar ? "text-emerald-400 bg-emerald-500/15" : "text-zinc-400 hover:text-white hover:bg-[#2a2a40]"
                        }`}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    Comment
                    {openComments > 0 && (
                        <span className="px-1 py-0 text-[9px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                            {openComments}
                        </span>
                    )}
                </button>

                {/* Sidebar panel toggle */}
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${showSidebar ? "text-white bg-[#3a3a55]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                    title="Toggle sidebar"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN CONTENT + SIDEBAR
            ═══════════════════════════════════════════════════ */}
            <div className="flex flex-1 overflow-hidden">
                {/* Viewer Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#15152a]">
                    {/* Upload Zone */}
                    {showUploadZone && (
                        <div className="p-4 border-b border-[#2a2a40]">
                            <UploadDropzone
                                orgId={orgId}
                                projectId={proof.project_id}
                                proofId={proof.id}
                                currentVersionNumber={versions[0]?.version_number || 0}
                                onUploadComplete={handleUploadComplete}
                            />
                        </div>
                    )}

                    {/* Viewer Canvas */}
                    <div className="flex-1 flex items-center justify-center overflow-auto relative">
                        {!selectedVersion ? (
                            <div className="text-center">
                                <div className="h-16 w-16 rounded-2xl bg-[#2a2a40] flex items-center justify-center mb-4 mx-auto">
                                    <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <p className="text-[14px] text-zinc-400 font-medium">{t("uploadFirst")}</p>
                                <p className="text-[12px] text-zinc-600 mt-1">{t("uploadFirstSub")}</p>
                            </div>
                        ) : compareMode && compareUrl ? (
                            /* ═══ COMPARE MODE ═══ */
                            <div className="flex h-full w-full">
                                <div className="flex-1 flex flex-col h-full border-r border-[#3a3a55]">
                                    <div className="h-8 flex items-center px-4 bg-[#1e1e32] border-b border-[#2a2a40]">
                                        <span className="text-[11px] font-bold text-zinc-400 font-mono">V.{compareVersion?.version_number}</span>
                                        <span className="ml-2 text-[10px] text-zinc-600">Previous</span>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center overflow-auto">
                                        <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-200">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={compareUrl} alt="Previous version" className="max-w-none shadow-2xl" draggable={false} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col h-full">
                                    <div className="h-8 flex items-center px-4 bg-[#1e1e32] border-b border-[#2a2a40]">
                                        <span className="text-[11px] font-bold text-emerald-400 font-mono">V.{selectedVersion.version_number}</span>
                                        <span className="ml-2 text-[10px] text-emerald-400/60">Current</span>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center overflow-auto relative">
                                        <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-200 relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={fileUrl} alt="Current version" className="max-w-none shadow-2xl" draggable={false} />
                                            <AnnotationCanvas
                                                pins={allPins}
                                                isAnnotating={isAnnotating}
                                                activePinId={activePinId}
                                                onPinClick={(id) => { setActivePinId(id); setShowSidebar(true); }}
                                                onCanvasClick={handleCanvasClick}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : fileUrl ? (
                            <div className="flex items-center justify-center w-full h-full">
                                {fileCategory === "image" && (
                                    <div className="relative transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})` }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fileUrl} alt={proof.title} className="max-w-none rounded shadow-2xl" draggable={false} />
                                        <AnnotationCanvas
                                            pins={allPins}
                                            isAnnotating={isAnnotating}
                                            activePinId={activePinId}
                                            onPinClick={(id) => { setActivePinId(id); setShowSidebar(true); }}
                                            onCanvasClick={handleCanvasClick}
                                        />
                                    </div>
                                )}
                                {fileCategory === "video" && (
                                    <div className="flex flex-col items-center w-full h-full relative">
                                        <div className="flex-1 flex items-center justify-center w-full relative overflow-hidden">
                                            <div className="relative transition-transform duration-200 ease-out inline-block" style={{ transform: `scale(${zoom})` }}>
                                                <video
                                                    ref={videoRef}
                                                    src={fileUrl}
                                                    className="max-w-none max-h-[80vh] rounded shadow-2xl block"
                                                    onTimeUpdate={() => setVideoTime(videoRef.current?.currentTime || 0)}
                                                    onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                                                    onPlay={() => setIsPlaying(true)}
                                                    onPause={() => setIsPlaying(false)}
                                                />
                                                <div className="absolute inset-0">
                                                    <AnnotationCanvas
                                                        pins={allPins}
                                                        isAnnotating={isAnnotating}
                                                        activePinId={activePinId}
                                                        onPinClick={(id) => { setActivePinId(id); setShowSidebar(true); }}
                                                        onCanvasClick={handleCanvasClick}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ═══ VIDEO CONTROLS (Ziflow-style: inside the viewer) ═══ */}
                                        <div className="w-full bg-gradient-to-t from-[#15152a] to-transparent pt-8 pb-2 px-4 shrink-0">
                                            <div className="max-w-3xl mx-auto">
                                                {/* Progress bar with markers */}
                                                <div
                                                    className="h-2 bg-[#3a3a55] rounded-full cursor-pointer mb-4 group hover:h-3 transition-all relative"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const pos = (e.clientX - rect.left) / rect.width;
                                                        if (videoRef.current) videoRef.current.currentTime = pos * videoDuration;
                                                    }}
                                                >
                                                    <div
                                                        className="h-full bg-[#4a90d9] rounded-full relative"
                                                        style={{ width: `${(videoTime / Math.max(videoDuration, 1)) * 100}%` }}
                                                    >
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#5aa0e9] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {/* Comment markers on timeline */}
                                                    {videoBookmarks.map(c => (
                                                        <div
                                                            key={`marker-${c.id}`}
                                                            title={c.content.slice(0, 30)}
                                                            className={`absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-400 cursor-pointer hover:scale-150 transition-transform shadow-[0_0_0_2px_#15152a] ${activePinId === c.id ? "scale-150 ring-2 ring-emerald-300" : ""}`}
                                                            style={{ left: `${(c.video_timestamp / Math.max(videoDuration, 1)) * 100}%` }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (videoRef.current) videoRef.current.currentTime = c.video_timestamp;
                                                                setActivePinId(c.id);
                                                                setShowSidebar(true);
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Controls row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424" />
                                                            </svg>
                                                        </button>
                                                        <span className="text-[13px] text-zinc-300 font-mono tracking-wide">
                                                            {formatTimestamp(videoTime)} <span className="text-zinc-600">/</span> {formatTimestamp(videoDuration)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => stepFrame(-1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] text-[16px] transition-colors" title="Previous frame">&lt;</button>
                                                        <button onClick={togglePlay} className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg" title="Play / Pause">
                                                            {isPlaying ? (
                                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                                            ) : (
                                                                <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                            )}
                                                        </button>
                                                        <button onClick={() => stepFrame(1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] text-[16px] transition-colors" title="Next frame">&gt;</button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={cycleSpeed} className="text-[13px] text-zinc-400 hover:text-zinc-200 font-mono transition-colors px-2 py-1 rounded-lg hover:bg-[#2a2a40]" title="Playback speed">
                                                            {playbackSpeed}x
                                                        </button>
                                                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Take screenshot">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                                                            </svg>
                                                        </button>
                                                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors" title="Picture-in-picture">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => videoRef.current?.requestFullscreen?.()}
                                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors"
                                                            title="Fullscreen"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {fileCategory === "pdf" && (
                                    <iframe src={fileUrl} className="w-full h-full rounded border border-[#2a2a40]" title={proof.title} />
                                )}
                                {(fileCategory === "design" || fileCategory === "unknown") && (
                                    <div className="text-center">
                                        <p className="text-[14px] text-zinc-400">{t("previewUnavailable")}</p>
                                        <a href={fileUrl} download className="text-[12px] text-emerald-400 hover:text-emerald-300 mt-2 inline-block underline underline-offset-4">
                                            {t("downloadFile")}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-pulse">
                                <div className="h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════
                    RIGHT SIDEBAR (Comments) — Ziflow style
                ═══════════════════════════════════════════════════ */}
                {showSidebar && (
                    <div className="w-[360px] border-l border-[#2a2a40] bg-[#1a1a2e] flex flex-col shrink-0">
                        <CommentPanel
                            comments={comments}
                            versionId={selectedVersion?.id || ""}
                            proofId={proof.id}
                            currentUserId={currentUserId}
                            activePinId={activePinId}
                            pendingPin={pendingPin}
                            videoTimestamp={fileCategory === "video" ? videoTime : null}
                            onCommentCreated={refreshComments}
                            onPinClick={(id) => setActivePinId(id)}
                            onCancelPin={() => setPendingPin(null)}
                        />
                    </div>
                )}
            </div>

            {/* Powered by badge */}
            <div className="h-6 flex items-center px-3 bg-[#15152a] border-t border-[#2a2a40] shrink-0">
                <span className="text-[10px] text-zinc-600">Powered by GorillaProof®</span>
            </div>
        </div>
    );
}
