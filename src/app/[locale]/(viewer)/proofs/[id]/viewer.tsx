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

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    in_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    changes_requested: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

const STATUS_LABELS: Record<string, string> = {
    draft: "draft",
    in_review: "inReview",
    approved: "approved",
    rejected: "rejected",
    changes_requested: "changesRequested",
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
        setPendingPin({ posX, posY });
        setShowSidebar(true);
    }, []);

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
    const pins = rootComments.map((c: any, i: number) => ({
        id: c.id, number: i + 1, posX: c.pos_x, posY: c.pos_y,
        status: c.status as "open" | "resolved", preview: c.content.slice(0, 80),
    }));
    const allPins = pendingPin
        ? [...pins, { id: "pending", number: pins.length + 1, posX: pendingPin.posX, posY: pendingPin.posY, status: "open" as const, preview: "..." }]
        : pins;

    const openComments = comments.filter((c: any) => !c.parent_comment_id && c.status === "open").length;

    return (
        <div className="flex flex-col h-screen bg-zinc-950">
            {/* ═══════════════════════════════════════════
                ZIFLOW-STYLE TOP BAR
            ═══════════════════════════════════════════ */}
            <header className="flex items-center h-11 px-3 border-b border-zinc-800/60 bg-zinc-950 shrink-0 z-30">
                {/* LEFT: Hamburger + Title + Version Dropdown + Compare */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Hamburger → Back */}
                    <Link
                        href={`/projects/${proof.project_id}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </Link>

                    {/* Title */}
                    <span className="text-[13px] font-medium text-zinc-100 truncate">{proof.title}</span>

                    {/* Version dropdown */}
                    <div className="relative" ref={versionDropdownRef}>
                        <button
                            onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                            className="flex items-center gap-1 text-[12px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 rounded px-2 py-1 transition-colors"
                        >
                            V.{selectedVersion?.version_number || 1}
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showVersionDropdown && versions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl py-1 min-w-[140px] z-50">
                                {versions.map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => { setSelectedVersion(v); setShowVersionDropdown(false); }}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${selectedVersion?.id === v.id ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-300 hover:bg-zinc-800"
                                            }`}
                                    >
                                        <span className="font-mono font-bold">V.{v.version_number}</span>
                                        <span className="text-zinc-500">
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
                            className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${compareMode ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                }`}
                            title={t("compare")}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* CENTER: Make Decision CTA */}
                <div className="relative" ref={decisionRef}>
                    <button
                        onClick={() => setShowDecisionMenu(!showDecisionMenu)}
                        className="h-7 px-4 rounded-md text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                        {t("makeDecision")}
                    </button>

                    {showDecisionMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl py-2 min-w-[240px] z-50">
                            {[
                                { status: "in_review", label: t("decisionPending"), icon: "⏳", color: "text-amber-400", bg: "bg-amber-500/10" },
                                { status: "approved", label: t("decisionApproved"), icon: "✅", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                { status: "approved_with_changes", label: t("decisionApprovedChanges"), icon: "✅", color: "text-emerald-400", bg: "" },
                                { status: "changes_requested", label: t("decisionChanges"), icon: "❌", color: "text-red-400", bg: "" },
                                { status: "not_relevant", label: t("decisionNotRelevant"), icon: "○", color: "text-zinc-400", bg: "" },
                            ].map((opt) => (
                                <button
                                    key={opt.status}
                                    onClick={() => handleDecision(opt.status)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-zinc-800 ${proof.status === opt.status ? `${opt.color} ${opt.bg}` : "text-zinc-300"
                                        }`}
                                >
                                    <span className="text-base w-5 text-center">{opt.icon}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: Share + Comment toggle + Avatar */}
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <button className="h-7 px-2.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        Share
                    </button>

                    {/* Comment toggle */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`h-7 px-2.5 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${showSidebar ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                            }`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                        Comment
                        {openComments > 0 && (
                            <span className="px-1.5 py-0 text-[9px] rounded-full bg-emerald-500/20 text-emerald-400">
                                {openComments}
                            </span>
                        )}
                    </button>

                    {/* Sidebar panel toggle */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${showSidebar ? "text-zinc-300 bg-zinc-800" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                            }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════
                SECONDARY TOOLBAR (Drawing Tools + Zoom)
            ═══════════════════════════════════════════ */}
            <div className="flex items-center h-9 px-3 border-b border-zinc-800/40 bg-zinc-950/80 shrink-0 gap-2">
                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                        className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                        </svg>
                    </button>
                    <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
                        className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                </div>

                <div className="w-px h-4 bg-zinc-800" />

                {/* Drawing tools */}
                {fileCategory === "image" && (
                    <div className="flex items-center gap-0.5">
                        {[
                            { id: "select", icon: "M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59", label: t("select") },
                            { id: "pin", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z", label: t("annotate") },
                            { id: "rect", icon: "M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-8.25A2.25 2.25 0 017.5 18v-2.25", label: "Rect" },
                            { id: "circle", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "Circle" },
                            { id: "arrow", icon: "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25", label: "Arrow" },
                            { id: "line", icon: "M4.5 19.5l15-15", label: "Line" },
                            { id: "pen", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z", label: "Draw" },
                        ].map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => tool.id === "pin" ? setIsAnnotating(true) : tool.id === "select" ? setIsAnnotating(false) : null}
                                className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${(tool.id === "pin" && isAnnotating) || (tool.id === "select" && !isAnnotating)
                                        ? "text-emerald-400 bg-emerald-500/10"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                    }`}
                                title={tool.label}
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                                </svg>
                            </button>
                        ))}

                        <div className="w-px h-4 bg-zinc-800 mx-0.5" />

                        {/* Text tool */}
                        <button className="h-7 w-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors font-bold text-[13px]" title="Text">
                            T
                        </button>

                        {/* Color picker */}
                        <button className="h-7 w-7 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors" title="Color">
                            <div className="h-3.5 w-3.5 rounded-full bg-red-500 ring-1 ring-zinc-700" />
                        </button>
                    </div>
                )}

                {/* Status badge */}
                <div className="ml-auto">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${STATUS_COLORS[proof.status]}`}>
                        {tp(STATUS_LABELS[proof.status] || "draft")}
                    </Badge>
                </div>

                {/* Upload button */}
                <button
                    onClick={() => setShowUploadZone(!showUploadZone)}
                    className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    title={t("uploadVersion")}
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </button>
            </div>

            {/* ═══════════════════════════════════════════
                MAIN CONTENT + SIDEBAR
            ═══════════════════════════════════════════ */}
            <div className="flex flex-1 overflow-hidden">
                {/* Viewer Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                    {/* Upload Zone */}
                    {showUploadZone && (
                        <div className="p-4 border-b border-zinc-800/40">
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
                                <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 mx-auto">
                                    <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <p className="text-[14px] text-zinc-400 font-medium">{t("uploadFirst")}</p>
                                <p className="text-[12px] text-zinc-600 mt-1">{t("uploadFirstSub")}</p>
                            </div>
                        ) : compareMode && compareUrl ? (
                            <div className="flex gap-1 h-full w-full items-center justify-center p-4">
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 mb-2 font-mono">V.{compareVersion?.version_number}</span>
                                    <div className="overflow-auto max-h-full rounded border border-zinc-800/40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={compareUrl} alt="Compare" className="max-w-full h-auto" />
                                    </div>
                                </div>
                                <div className="w-px bg-emerald-500/40 self-stretch mx-2" />
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 mb-2 font-mono">V.{selectedVersion.version_number}</span>
                                    <div className="overflow-auto max-h-full rounded border border-zinc-800/40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fileUrl} alt="Current" className="max-w-full h-auto" />
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
                                    <div className="flex flex-col items-center w-full h-full">
                                        <div className="flex-1 flex items-center justify-center w-full">
                                            <video
                                                ref={videoRef}
                                                src={fileUrl}
                                                className="max-w-full max-h-full rounded shadow-2xl"
                                                style={{ maxHeight: "calc(100vh - 180px)" }}
                                                onTimeUpdate={() => setVideoTime(videoRef.current?.currentTime || 0)}
                                                onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                                                onPlay={() => setIsPlaying(true)}
                                                onPause={() => setIsPlaying(false)}
                                            />
                                        </div>
                                        {/* Custom Video Controls */}
                                        <div className="w-full max-w-3xl mx-auto px-4 pb-2">
                                            {/* Progress bar */}
                                            <div
                                                className="h-1 bg-zinc-800 rounded-full cursor-pointer mb-2 group hover:h-1.5 transition-all"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const pos = (e.clientX - rect.left) / rect.width;
                                                    if (videoRef.current) videoRef.current.currentTime = pos * videoDuration;
                                                }}
                                            >
                                                <div
                                                    className="h-full bg-blue-500 rounded-full relative"
                                                    style={{ width: `${(videoTime / Math.max(videoDuration, 1)) * 100}%` }}
                                                >
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-400 shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424" />
                                                        </svg>
                                                    </button>
                                                    <span className="text-[11px] text-zinc-400 font-mono">
                                                        {formatTimestamp(videoTime)} / {formatTimestamp(videoDuration)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => stepFrame(-1)} className="text-zinc-400 hover:text-zinc-200 text-[13px] transition-colors">◂</button>
                                                    <button onClick={togglePlay} className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-200 hover:bg-zinc-700 transition-colors">
                                                        {isPlaying ? (
                                                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                                        ) : (
                                                            <svg className="h-3.5 w-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        )}
                                                    </button>
                                                    <button onClick={() => stepFrame(1)} className="text-zinc-400 hover:text-zinc-200 text-[13px] transition-colors">▸</button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={cycleSpeed} className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono transition-colors">
                                                        {playbackSpeed}x
                                                    </button>
                                                    <button
                                                        onClick={() => videoRef.current?.requestFullscreen?.()}
                                                        className="text-zinc-400 hover:text-zinc-200 transition-colors"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {fileCategory === "pdf" && (
                                    <iframe src={fileUrl} className="w-full h-full rounded border border-zinc-800" title={proof.title} />
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
                                <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    RIGHT SIDEBAR (Comments)
                ═══════════════════════════════════════════ */}
                {showSidebar && (
                    <div className="w-80 border-l border-zinc-800/60 bg-zinc-950/95 flex flex-col shrink-0">
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
        </div>
    );
}
