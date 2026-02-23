"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { UploadDropzone } from "@/components/upload/dropzone";
import { AnnotationCanvas } from "@/components/annotations/annotation-canvas";
import { CommentPanel } from "@/components/annotations/comment-panel";
import { DrawingCanvas, DrawingCanvasHandle, DrawnShape } from "@/components/annotations/drawing-canvas";
import { ColorPicker } from "@/components/viewer/color-picker";
import { ShareDialog } from "@/components/viewer/share-dialog";
import { getSignedUrl, getFileCategory } from "@/lib/storage";
import { getComments, carryCommentsForward } from "@/lib/actions/comments";
import { updateProofStatus, updateProofDeadline } from "@/lib/actions/proofs";
import { logActivity } from "@/lib/actions/activity";
import { ActivityLogPanel } from "@/components/viewer/activity-log-panel";
import { usePresence } from "@/hooks/use-presence";
import { notifyStatusChange } from "@/lib/actions/email";
import { useToast } from "@/components/ui/toast-provider";
import { NotificationCenter } from "@/components/ui/notification-center";
import { submitDecision, getDecisions, lockProof, unlockProof, type ProofDecision } from "@/lib/actions/decisions";

interface ProofViewerProps {
    proof: any;
    versions: any[];
    initialComments: any[];
    projectName: string;
    orgId: string;
    currentUserId: string;
    orgMembers?: any[];
}

const FILE_TYPE_LABELS: Record<string, string> = {
    image: "IMAGE",
    video: "VIDEO",
    pdf: "PDF",
    design: "DESIGN",
    unknown: "FILE",
};

export function ProofViewer({ proof, versions, initialComments, projectName, orgId, currentUserId, orgMembers = [] }: ProofViewerProps) {
    const t = useTranslations("dashboard.viewer");
    const tp = useTranslations("dashboard.projects");
    const router = useRouter();
    const { toast } = useToast();

    // Version state
    const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [showUploadZone, setShowUploadZone] = useState(versions.length === 0);
    const [compareMode, setCompareMode] = useState(false);
    const [compareVersion, setCompareVersion] = useState<any>(null);
    const [compareUrl, setCompareUrl] = useState<string>("");
    const [zoom, setZoom] = useState(1);

    // UI state
    const [showDecisionMenu, setShowDecisionMenu] = useState(false);
    const [showZoomPresets, setShowZoomPresets] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showVersionDropdown, setShowVersionDropdown] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [activeTool, setActiveTool] = useState<string>("pin");
    const [compareView, setCompareView] = useState<"sideBySide" | "overlay">("sideBySide");
    const [overlayPos, setOverlayPos] = useState(50);

    // Deadline state
    const [deadlineValue, setDeadlineValue] = useState<string | null>(proof.deadline || null);
    const [editingDeadline, setEditingDeadline] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<"comments" | "activity">("comments");

    // Presence — find current user data from orgMembers
    const currentUserData = orgMembers.find((m) => m.users?.id === currentUserId)?.users || { id: currentUserId, full_name: null, email: "user" };
    const { onlineUsers } = usePresence(proof.id, { id: currentUserId, full_name: currentUserData.full_name, email: currentUserData.email });

    // Annotation state
    const [isAnnotating, setIsAnnotating] = useState(true);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [pendingPin, setPendingPin] = useState<{ posX: number; posY: number } | null>(null);
    const [comments, setComments] = useState<any[]>(initialComments);

    // Drawing state
    const [annotColor, setAnnotColor] = useState("#ef4444");
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [sidebarLayout, setSidebarLayout] = useState<"right" | "bottom">("right");
    const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [viewerSize, setViewerSize] = useState({ width: 800, height: 600 });
    const [drawingShapes, setDrawingShapes] = useState<DrawnShape[]>([]);

    // Video state
    const videoRef = useRef<HTMLVideoElement>(null);
    const compareVideoRef = useRef<HTMLVideoElement>(null);
    const [videoTime, setVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);

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

    // Track viewer container size
    useEffect(() => {
        const el = viewerContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setViewerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ═══ UNIFIED KEYBOARD SHORTCUTS ═══
    // Ziflow/Frame.io standard: J/K/L, M, F, Shift+Arrow, 0-9, Space, +/-, Ctrl+Z/Y
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isEditable = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

            // ── Drawing: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (always active) ──
            if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) drawingCanvasRef.current?.redo();
                else drawingCanvasRef.current?.undo();
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "y") {
                e.preventDefault();
                drawingCanvasRef.current?.redo();
                return;
            }

            // Skip all other shortcuts when typing
            if (isEditable) return;

            const v = videoRef.current;
            const dur = v && isFinite(v.duration) ? v.duration : 0;

            // ── Space / K = Play/Pause ──
            if (e.key === " " || e.code === "Space" || e.key === "k") {
                if (target.tagName === "BUTTON") return;
                e.preventDefault();
                if (v) {
                    if (v.paused) { v.play(); setIsPlaying(true); }
                    else { v.pause(); setIsPlaying(false); }
                }
                return;
            }

            // ── J = Rewind 5s ──
            if (e.key === "j") {
                e.preventDefault();
                if (v && dur > 0) v.currentTime = Math.max(0, v.currentTime - 5);
                return;
            }

            // ── L = Forward 5s ──
            if (e.key === "l") {
                e.preventDefault();
                if (v && dur > 0) v.currentTime = Math.min(dur, v.currentTime + 5);
                return;
            }

            // ── Arrow keys: frame step or 15-frame skip with Shift ──
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (v && dur > 0) {
                    v.pause(); setIsPlaying(false);
                    v.currentTime = Math.max(0, v.currentTime + (e.shiftKey ? -0.5 : -1 / 30));
                }
                return;
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                if (v && dur > 0) {
                    v.pause(); setIsPlaying(false);
                    v.currentTime = Math.min(dur, v.currentTime + (e.shiftKey ? 0.5 : 1 / 30));
                }
                return;
            }

            // ── M = Mute/Unmute ──
            if (e.key === "m") {
                e.preventDefault();
                if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                }
                return;
            }

            // ── F = Fullscreen toggle ──
            if (e.key === "f") {
                e.preventDefault();
                const container = viewerContainerRef.current;
                if (container) {
                    if (document.fullscreenElement) document.exitFullscreen();
                    else container.requestFullscreen?.();
                }
                return;
            }

            // ── 1-9 = Jump to 10%-90% of video ──
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9 && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                if (v && dur > 0) v.currentTime = dur * (num / 10);
                return;
            }

            // ── 0 = Reset zoom to 100% ──
            if (e.key === "0") { setZoom(1); return; }

            // ── +/- = Zoom in/out ──
            if (e.key === "+" || e.key === "=") { setZoom((z) => Math.min(z + 0.25, 5)); return; }
            if (e.key === "-") { setZoom((z) => Math.max(z - 0.25, 0.25)); return; }

            // ── A = Toggle annotation mode ──
            if (e.key === "a") { setIsAnnotating((v) => !v); return; }

            // ── Escape = Close menus / shortcuts ──
            if (e.key === "Escape") { setShowDecisionMenu(false); setShowVersionDropdown(false); setShowShortcuts(false); return; }

            // ── ? = Toggle shortcuts help ──
            if (e.key === "?") { setShowShortcuts((v) => !v); return; }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
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
            getSignedUrl(compareVersion.file_url).then(url => {
                setCompareUrl(url);
            });
        } else if (!compareMode) {
            setCompareUrl("");
        }
    }, [compareMode, compareVersion]);

    // Refresh comments on version change
    useEffect(() => {
        if (selectedVersion?.id) {
            getComments(selectedVersion.id).then(({ data }) => setComments(data));
        }
    }, [selectedVersion]);

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

    const [reviewerDecisions, setReviewerDecisions] = useState<any[]>([]);
    const isLocked = !!proof.locked_at;

    useEffect(() => {
        getDecisions(proof.id).then(({ data }) => setReviewerDecisions(data));
    }, [proof.id]);

    const handleDecision = async (status: string) => {
        if (isLocked) { toast(t("proofLocked"), "error"); return; }
        // Record per-reviewer decision
        const validDecisions: ProofDecision[] = ["approved", "approved_with_changes", "changes_requested", "not_relevant", "rejected"];
        if (validDecisions.includes(status as ProofDecision)) {
            await submitDecision(proof.id, status as ProofDecision);
        }
        // Update overall proof status
        await updateProofStatus(proof.id, status, proof.project_id);
        logActivity({ proofId: proof.id, action: "status_changed", metadata: { to: status } });
        // Refresh reviewer decisions
        getDecisions(proof.id).then(({ data }) => setReviewerDecisions(data));
        // Email notify org members (non-blocking)
        const recipients = orgMembers
            .filter((m) => m.users?.id !== currentUserId && m.users?.email)
            .map((m) => ({ email: m.users.email, name: m.users.full_name || undefined }));
        if (recipients.length > 0) {
            notifyStatusChange({
                proofTitle: proof.title,
                proofUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/proofs/${proof.id}`,
                changedBy: currentUserData.full_name || currentUserData.email || "Alguém",
                newStatus: status,
                recipients,
            });
        }
        setShowDecisionMenu(false);
        toast(status === "approved" ? "Aprovado!" : `Decisão registrada: ${status}`, "success");
        router.refresh();
    };

    const handleToggleLock = async () => {
        if (isLocked) {
            await unlockProof(proof.id);
            toast("🔓 Prova destravada", "success");
        } else {
            await lockProof(proof.id);
            toast("🔒 Prova travada — sem mais comentários ou decisões", "info");
        }
        router.refresh();
    };

    // Video controls (sync both videos when in compare mode)
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play(); setIsPlaying(true);
            compareVideoRef.current?.play();
        } else {
            videoRef.current.pause(); setIsPlaying(false);
            compareVideoRef.current?.pause();
        }
    };
    const stepFrame = (dir: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime += dir * (1 / 30);
        if (compareVideoRef.current) {
            compareVideoRef.current.pause();
            compareVideoRef.current.currentTime = videoRef.current.currentTime;
        }
    };
    const cycleSpeed = () => {
        const speeds = [0.5, 1, 1.5, 2];
        const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(next);
        if (videoRef.current) videoRef.current.playbackRate = next;
        if (compareVideoRef.current) compareVideoRef.current.playbackRate = next;
    };
    const formatTimestamp = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
    };
    const takeScreenshot = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const link = document.createElement("a");
        link.download = `screenshot_${formatTimestamp(videoTime).replace(/:/g, "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        if (isMuted) {
            videoRef.current.muted = false;
            videoRef.current.volume = volume;
            if (compareVideoRef.current) { compareVideoRef.current.muted = false; compareVideoRef.current.volume = volume; }
            setIsMuted(false);
        } else {
            videoRef.current.muted = true;
            if (compareVideoRef.current) compareVideoRef.current.muted = true;
            setIsMuted(true);
        }
    }, [isMuted, volume]);

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
        <div className="flex flex-col h-screen bg-[#1a1a2e] overflow-hidden">
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
                        data-tip="Voltar ao projeto"
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
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300 hover:text-white bg-[#2a2a40] rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                            data-tip="Selecionar versão"
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
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors cursor-pointer ${selectedVersion?.id === v.id ? "text-blue-400 bg-blue-500/10" : "text-zinc-300 hover:bg-[#2a2a40]"
                                            }`}
                                        data-tip={`Switch to version ${v.version_number}`}
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
                            onClick={() => {
                                const entering = !compareMode;
                                setCompareMode(entering);
                                if (entering) {
                                    // Auto-select previous version
                                    const currentIdx = versions.findIndex((v: any) => v.id === selectedVersion?.id);
                                    const prevVersion = versions[currentIdx + 1] || versions[versions.length - 1];
                                    if (prevVersion && prevVersion.id !== selectedVersion?.id) {
                                        setCompareVersion(prevVersion);
                                    }
                                }
                            }}
                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${compareMode ? "text-blue-400 bg-blue-500/15" : "text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2a40]"
                                }`}
                            data-tip="Comparar versões"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </button>
                    )}

                    {/* Upload new version — next to version picker */}
                    <button
                        onClick={() => setShowUploadZone(true)}
                        className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors cursor-pointer border border-dashed border-[#3a3a55] hover:border-zinc-500"
                        data-tip="Enviar nova versão"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        + Version
                    </button>

                    {/* Deadline chip */}
                    <div className="relative flex items-center">
                        {editingDeadline ? (
                            <input
                                type="date"
                                autoFocus
                                className="h-9 px-3 bg-[#2a2a40] text-zinc-300 rounded-lg text-[12px] border border-[#3a3a55] outline-none focus:border-blue-500"
                                defaultValue={deadlineValue ? new Date(deadlineValue).toISOString().split("T")[0] : ""}
                                onBlur={(e) => {
                                    setEditingDeadline(false);
                                    const val = e.target.value;
                                    if (val) {
                                        const iso = new Date(val + "T23:59:59").toISOString();
                                        setDeadlineValue(iso);
                                        updateProofDeadline(proof.id, iso, proof.project_id);
                                        logActivity({ proofId: proof.id, action: "deadline_set", metadata: { deadline: iso } });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    if (e.key === "Escape") setEditingDeadline(false);
                                }}
                            />
                        ) : (
                            <button
                                onClick={() => setEditingDeadline(true)}
                                className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer border ${deadlineValue
                                    ? (() => {
                                        const now = new Date();
                                        const dl = new Date(deadlineValue);
                                        const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
                                        if (hoursLeft < 0) return "text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20";
                                        if (hoursLeft < 24) return "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20";
                                        return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20";
                                    })()
                                    : "text-zinc-500 border-[#3a3a55] hover:text-zinc-300 hover:bg-[#2a2a40]"
                                    }`}
                                data-tip={deadlineValue ? "Alterar prazo" : "Definir prazo"}
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                {deadlineValue
                                    ? new Date(deadlineValue).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                                    : "Prazo"
                                }
                            </button>
                        )}
                        {deadlineValue && !editingDeadline && (
                            <button
                                onClick={() => {
                                    setDeadlineValue(null);
                                    updateProofDeadline(proof.id, null, proof.project_id);
                                    logActivity({ proofId: proof.id, action: "deadline_removed" });
                                }}
                                className="ml-0.5 h-5 w-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[10px]"
                                data-tip="Remover prazo"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* CENTER: Make Decision */}
                <div className="relative" ref={decisionRef}>
                    {isLocked && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-md bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-medium">
                            🔒 Prova travada
                        </div>
                    )}
                    <button
                        onClick={() => setShowDecisionMenu(!showDecisionMenu)}
                        className={`h-[36px] px-6 rounded-lg text-[14px] font-bold transition-all shadow-lg cursor-pointer ${isLocked
                            ? "bg-zinc-700 text-zinc-400 shadow-none cursor-not-allowed"
                            : "bg-[#1a8cff] hover:bg-[#0077ee] text-white shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02]"
                            }`}
                        data-tip="Definir status (aprovar, solicitar alterações, etc.)"
                    >
                        {isLocked ? "🔒 Locked" : t("makeDecision")}
                    </button>

                    {showDecisionMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1.5 min-w-[260px] z-50">
                            {[
                                { status: "in_review", label: t("decisionPending"), dot: "bg-green-500", active: true },
                                { status: "approved", label: t("decisionApproved"), dot: "bg-green-500", active: false },
                                { status: "approved_with_changes", label: t("decisionApprovedChanges"), dot: "bg-green-500", active: false },
                                { status: "changes_requested", label: t("decisionChanges"), dot: "bg-red-500", active: false },
                                { status: "not_relevant", label: t("decisionNotRelevant"), dot: "bg-zinc-500", active: false },
                                { status: "rejected", label: t("decisionRejected"), dot: "bg-red-600", active: false },
                            ].map((opt) => (
                                <button
                                    key={opt.status}
                                    onClick={() => handleDecision(opt.status)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${proof.status === opt.status
                                        ? "bg-blue-500/20 text-white"
                                        : "text-zinc-300 hover:bg-[#2a2a40]"
                                        }`}
                                    data-tip={opt.label}
                                >
                                    <span className={`h-4 w-4 rounded-full border-2 ${proof.status === opt.status ? "border-green-400 bg-green-500" : `border-zinc-600 ${opt.dot}`} flex items-center justify-center`}>
                                        {proof.status === opt.status && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        )}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                            {/* Per-reviewer decisions summary */}
                            {reviewerDecisions.length > 0 && (
                                <div className="border-t border-[#3a3a55] mt-1.5 pt-1.5 px-3">
                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Decisões dos revisores</p>
                                    {reviewerDecisions.map((d: any) => {
                                        const name = d.users?.full_name || d.users?.email || "?";
                                        const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                                        const decColor: Record<string, string> = { approved: "text-green-400", approved_with_changes: "text-emerald-400", changes_requested: "text-amber-400", not_relevant: "text-zinc-400", rejected: "text-red-400" };
                                        return (
                                            <div key={d.id} className="flex items-center gap-2 py-1">
                                                <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">{initials}</div>
                                                <span className="text-[11px] text-zinc-400 flex-1 truncate">{name}</span>
                                                <span className={`text-[10px] font-medium ${decColor[d.decision] || "text-zinc-500"}`}>{d.decision.replace(/_/g, " ")}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {/* Lock/unlock */}
                            <div className="border-t border-[#3a3a55] mt-1.5 pt-1.5 mx-2">
                                <button
                                    onClick={handleToggleLock}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-[12px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors"
                                >
                                    {isLocked ? "🔓 Destravar prova" : "🔒 Travar prova"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Shortcuts + Share + Avatar */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <button onClick={() => setShowShortcuts(true)} className="h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors flex items-center justify-center cursor-pointer" data-tip="Atalhos do teclado (?)">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </button>
                    <button onClick={() => setShowShareDialog(true)} className="h-[36px] px-4 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors flex items-center gap-2 cursor-pointer" data-tip="Compartilhar">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        Share
                    </button>
                    {/* Download Original */}
                    {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" download className="h-[36px] px-4 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors flex items-center gap-2 cursor-pointer no-underline">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Download
                        </a>
                    )}
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast("Link copiado para a área de transferência!", "success");
                        }}
                        className="h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors flex items-center justify-center cursor-pointer"
                        data-tip="Copiar link"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" />
                        </svg>
                    </button>
                    {/* Notification bell */}
                    <NotificationCenter userId={currentUserId} />
                    {/* Online presence avatars */}
                    {onlineUsers.length > 0 && (
                        <div className="flex items-center -space-x-2 mr-1">
                            {onlineUsers.filter(u => u.userId !== currentUserId).slice(0, 5).map((u) => {
                                const initials = u.fullName ? u.fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : u.email.charAt(0).toUpperCase();
                                return (
                                    <div key={u.userId} className="h-7 w-7 rounded-full bg-[#2a2a40] flex items-center justify-center text-[9px] font-bold text-emerald-400 border-2 border-emerald-500/60 ring-2 ring-[#15152a] cursor-default" title={`${u.fullName || u.email} • Online`}>
                                        {initials}
                                    </div>
                                );
                            })}
                            {onlineUsers.filter(u => u.userId !== currentUserId).length > 5 && (
                                <div className="h-7 w-7 rounded-full bg-[#2a2a40] flex items-center justify-center text-[9px] font-bold text-zinc-400 border-2 border-[#3a3a55] ring-2 ring-[#15152a]">
                                    +{onlineUsers.filter(u => u.userId !== currentUserId).length - 5}
                                </div>
                            )}
                        </div>
                    )}
                    {/* User avatar */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white" data-tip="Seu perfil">
                        {currentUserData.full_name ? currentUserData.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : currentUserId?.slice(0, 2).toUpperCase() || "U"}
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
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Diminuir zoom (-)">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                        </svg>
                    </button>
                    <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Aumentar zoom (+)">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowZoomPresets(!showZoomPresets)} className="text-[12px] text-zinc-400 hover:text-white font-mono px-2 py-1 hover:bg-[#2a2a40] rounded-lg transition-colors min-w-[48px] text-center cursor-pointer" data-tip="Presets de zoom">
                            {Math.round(zoom * 100)} %
                        </button>
                        {showZoomPresets && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[120px] z-50">
                                {[25, 50, 75, 100, 125, 150, 200, 300, 400].map((pct) => (
                                    <button
                                        key={pct}
                                        onClick={() => { setZoom(pct / 100); setShowZoomPresets(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${Math.round(zoom * 100) === pct ? "bg-blue-500/20 text-white" : "text-zinc-400 hover:bg-[#2a2a40] hover:text-zinc-200"}`}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                                <div className="border-t border-[#3a3a55] my-1" />
                                <button onClick={() => { setZoom(1); setShowZoomPresets(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-zinc-400 hover:bg-[#2a2a40] hover:text-zinc-200 cursor-pointer">
                                    ↻ Reset (100%)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                {/* Fit/Crop icons */}
                <button onClick={() => setZoom(1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Ajustar à tela">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </button>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Recorte / Área de foco">
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
                        <button onClick={() => drawingCanvasRef.current?.undo()} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Desfazer (Ctrl+Z)">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        </button>
                        <button onClick={() => drawingCanvasRef.current?.redo()} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Refazer (Ctrl+Shift+Z)">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                        </button>

                        <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                        {drawingTools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id);
                                    if (tool.id === "pin") setIsAnnotating(true);
                                    else setIsAnnotating(false);
                                }}
                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${activeTool === tool.id
                                    ? "text-white bg-[#3a3a55]"
                                    : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"
                                    }`}
                                data-tip={tool.label}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                                </svg>
                            </button>
                        ))}

                        <div className="w-px h-4 bg-[#3a3a55] mx-1" />

                        {/* Text */}
                        <button
                            onClick={() => { setActiveTool("text"); setIsAnnotating(false); }}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-[15px] transition-colors ${activeTool === "text" ? "text-white bg-[#3a3a55]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                            data-tip="Adicionar anotação de texto"
                        >
                            T
                        </button>

                        {/* Color Picker */}
                        <ColorPicker color={annotColor} onChange={setAnnotColor} />

                        {/* Sidebar layout toggle */}
                        <button
                            onClick={() => setSidebarLayout(sidebarLayout === "right" ? "bottom" : "right")}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${sidebarLayout === "bottom" ? "text-blue-400 bg-blue-500/15" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                            data-tip={`Layout: ${sidebarLayout === "right" ? "Sidebar right" : "Panel bottom"} (click to toggle)`}
                        >
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
                    className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer ${showSidebar ? "text-emerald-400 bg-emerald-500/15" : "text-zinc-400 hover:text-white hover:bg-[#2a2a40]"
                        }`}
                    data-tip={showSidebar ? "Esconder coment\u00e1rios" : "Mostrar coment\u00e1rios"}
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
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${showSidebar ? "text-white bg-[#3a3a55]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`}
                    data-tip="Alternar painel lateral"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN CONTENT + SIDEBAR
            ═══════════════════════════════════════════════════ */}
            <div className="flex flex-1 overflow-hidden viewer-no-scrollbar">
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
                    <div ref={viewerContainerRef} className="flex-1 flex items-center justify-center overflow-hidden relative viewer-no-scrollbar">
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
                        ) : compareMode && compareUrl && fileCategory !== "video" ? (
                            /* ═══ COMPARE MODE ═══ */
                            <div className="flex flex-col h-full w-full">
                                {/* Compare mode toggle bar */}
                                <div className="h-8 flex items-center justify-center gap-4 bg-[#1e1e32] border-b border-[#2a2a40] shrink-0">
                                    <div className="flex items-center bg-[#15152a] rounded-md p-0.5">
                                        <button
                                            onClick={() => setCompareView("sideBySide")}
                                            className={`px-3 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${compareView === "sideBySide" ? "bg-[#2a2a40] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                                        >
                                            Side by Side
                                        </button>
                                        <button
                                            onClick={() => setCompareView("overlay")}
                                            className={`px-3 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${compareView === "overlay" ? "bg-[#2a2a40] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                                        >
                                            Sobreposição
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-zinc-500 font-mono">V.{compareVersion?.version_number}</span>
                                        <span className="text-zinc-600">vs</span>
                                        <span className="text-emerald-400 font-mono">V.{selectedVersion.version_number}</span>
                                    </div>
                                </div>

                                {compareView === "sideBySide" ? (
                                    /* ── SIDE BY SIDE ── */
                                    <div className="flex flex-1 h-0">
                                        <div className="flex-1 flex items-center justify-center overflow-auto border-r border-[#3a3a55]">
                                            <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-200">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={compareUrl} alt="Versão anterior" className="max-w-none shadow-2xl" draggable={false} />
                                            </div>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center overflow-auto relative">
                                            <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-200 relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={fileUrl} alt="Versão atual" className="max-w-none shadow-2xl" draggable={false} />
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
                                ) : (
                                    /* ── OVERLAY WITH SLIDER ── */
                                    <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                                        <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-200 relative">
                                            {/* Base layer: previous version */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={compareUrl} alt="Versão anterior" className="max-w-none shadow-2xl block" draggable={false} />

                                            {/* Clipped layer: current version */}
                                            <div
                                                className="absolute inset-0"
                                                style={{ clipPath: `inset(0 ${100 - overlayPos}% 0 0)` }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={fileUrl} alt="Versão atual" className="max-w-none shadow-2xl block" draggable={false} />
                                            </div>

                                            {/* Slider handle */}
                                            <div
                                                className="absolute top-0 bottom-0 z-30 cursor-col-resize"
                                                style={{ left: `${overlayPos}%`, transform: "translateX(-50%)" }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const container = e.currentTarget.parentElement!;
                                                    const rect = container.getBoundingClientRect();
                                                    const onMove = (me: MouseEvent) => {
                                                        const pct = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
                                                        setOverlayPos(pct);
                                                    };
                                                    const onUp = () => {
                                                        window.removeEventListener("mousemove", onMove);
                                                        window.removeEventListener("mouseup", onUp);
                                                    };
                                                    window.addEventListener("mousemove", onMove);
                                                    window.addEventListener("mouseup", onUp);
                                                }}
                                            >
                                                {/* Vertical line */}
                                                <div className="w-0.5 h-full bg-white/80 shadow-lg" />
                                                {/* Handle grip */}
                                                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-[#1a1a2e]">
                                                    <svg className="h-4 w-4 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                    </svg>
                                                </div>
                                                {/* Labels */}
                                                <div className="absolute top-2 -translate-x-[calc(100%+8px)] bg-[#1a1a2e]/90 text-zinc-400 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap">
                                                    V.{compareVersion?.version_number}
                                                </div>
                                                <div className="absolute top-2 translate-x-2 bg-[#1a1a2e]/90 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap">
                                                    V.{selectedVersion.version_number}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                        <DrawingCanvas
                                            ref={drawingCanvasRef}
                                            tool={["rect", "circle", "arrow", "line", "pen", "text", "select"].includes(activeTool) ? activeTool as any : null}
                                            color={annotColor}
                                            containerWidth={viewerSize.width}
                                            containerHeight={viewerSize.height}
                                            onShapesChange={setDrawingShapes}
                                        />
                                    </div>
                                )}
                                {fileCategory === "video" && (
                                    <div className="flex flex-col w-full h-full relative overflow-hidden">
                                        {/* Compare mode toggle bar (only in compare mode) */}
                                        {compareMode && compareUrl && (
                                            <div className="h-8 flex items-center justify-center gap-4 bg-[#1e1e32] border-b border-[#2a2a40] shrink-0">
                                                <div className="flex items-center bg-[#15152a] rounded-md p-0.5">
                                                    <button
                                                        onClick={() => setCompareView("sideBySide")}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${compareView === "sideBySide" ? "bg-[#2a2a40] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                                                    >
                                                        Side by Side
                                                    </button>
                                                    <button
                                                        onClick={() => setCompareView("overlay")}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${compareView === "overlay" ? "bg-[#2a2a40] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                                                    >
                                                        Sobreposição
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <span className="text-zinc-500 font-mono">V.{compareVersion?.version_number}</span>
                                                    <span className="text-zinc-600">vs</span>
                                                    <span className="text-emerald-400 font-mono">V.{selectedVersion.version_number}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Video content area */}
                                        {compareMode && compareUrl ? (
                                            /* ── COMPARE: Two videos ── */
                                            compareView === "sideBySide" ? (
                                                <div className="flex flex-1 h-0">
                                                    <div className="flex-1 flex items-center justify-center overflow-hidden border-r border-[#3a3a55] relative">
                                                        <div className="absolute top-2 left-2 bg-[#1a1a2e]/90 text-zinc-400 text-[9px] font-mono px-2 py-0.5 rounded z-10">V.{compareVersion?.version_number} (anterior)</div>
                                                        <video
                                                            ref={compareVideoRef}
                                                            src={compareUrl}
                                                            className="max-w-none max-h-full rounded shadow-2xl block"
                                                            muted
                                                            onLoadedMetadata={() => {
                                                                if (compareVideoRef.current && videoRef.current) {
                                                                    compareVideoRef.current.currentTime = videoRef.current.currentTime;
                                                                    compareVideoRef.current.playbackRate = playbackSpeed;
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                                                        <div className="absolute top-2 left-2 bg-[#1a1a2e]/90 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded z-10">V.{selectedVersion.version_number} (atual)</div>
                                                        <div className="relative transition-transform duration-200 ease-out inline-block" style={{ transform: `scale(${zoom})` }}>
                                                            <video
                                                                ref={videoRef}
                                                                src={fileUrl}
                                                                className="max-w-none max-h-[70vh] rounded shadow-2xl block"
                                                                onTimeUpdate={() => {
                                                                    setVideoTime(videoRef.current?.currentTime || 0);
                                                                    // Sync compare video
                                                                    if (compareVideoRef.current && videoRef.current) {
                                                                        const diff = Math.abs(compareVideoRef.current.currentTime - videoRef.current.currentTime);
                                                                        if (diff > 0.3) compareVideoRef.current.currentTime = videoRef.current.currentTime;
                                                                    }
                                                                }}
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
                                                                <DrawingCanvas
                                                                    ref={drawingCanvasRef}
                                                                    tool={["rect", "circle", "arrow", "line", "pen", "text", "select"].includes(activeTool) ? activeTool as any : null}
                                                                    color={annotColor}
                                                                    containerWidth={viewerSize.width}
                                                                    containerHeight={viewerSize.height}
                                                                    videoTimestamp={videoTime}
                                                                    onShapesChange={setDrawingShapes}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ── COMPARE: Overlay ── */
                                                <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                                                    <div className="relative">
                                                        <video
                                                            ref={compareVideoRef}
                                                            src={compareUrl}
                                                            className="max-w-none max-h-[70vh] rounded shadow-2xl block"
                                                            muted
                                                            onLoadedMetadata={() => {
                                                                if (compareVideoRef.current && videoRef.current) {
                                                                    compareVideoRef.current.currentTime = videoRef.current.currentTime;
                                                                    compareVideoRef.current.playbackRate = playbackSpeed;
                                                                }
                                                            }}
                                                        />
                                                        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - overlayPos}% 0 0)` }}>
                                                            <video
                                                                ref={videoRef}
                                                                src={fileUrl}
                                                                className="max-w-none max-h-[70vh] rounded shadow-2xl block w-full h-full object-contain"
                                                                onTimeUpdate={() => {
                                                                    setVideoTime(videoRef.current?.currentTime || 0);
                                                                    if (compareVideoRef.current && videoRef.current) {
                                                                        const diff = Math.abs(compareVideoRef.current.currentTime - videoRef.current.currentTime);
                                                                        if (diff > 0.3) compareVideoRef.current.currentTime = videoRef.current.currentTime;
                                                                    }
                                                                }}
                                                                onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                                                                onPlay={() => setIsPlaying(true)}
                                                                onPause={() => setIsPlaying(false)}
                                                            />
                                                        </div>
                                                        {/* Slider */}
                                                        <div
                                                            className="absolute top-0 bottom-0 z-30 cursor-col-resize"
                                                            style={{ left: `${overlayPos}%`, transform: "translateX(-50%)" }}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                const container = e.currentTarget.parentElement!;
                                                                const rect = container.getBoundingClientRect();
                                                                const onMove = (me: MouseEvent) => {
                                                                    const pct = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
                                                                    setOverlayPos(pct);
                                                                };
                                                                const onUp = () => {
                                                                    window.removeEventListener("mousemove", onMove);
                                                                    window.removeEventListener("mouseup", onUp);
                                                                };
                                                                window.addEventListener("mousemove", onMove);
                                                                window.addEventListener("mouseup", onUp);
                                                            }}
                                                        >
                                                            <div className="w-0.5 h-full bg-white/80 shadow-lg" />
                                                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-[#1a1a2e]">
                                                                <svg className="h-4 w-4 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                                </svg>
                                                            </div>
                                                            <div className="absolute top-2 -translate-x-[calc(100%+8px)] bg-[#1a1a2e]/90 text-zinc-400 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap">
                                                                V.{compareVersion?.version_number}
                                                            </div>
                                                            <div className="absolute top-2 translate-x-2 bg-[#1a1a2e]/90 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap">
                                                                V.{selectedVersion.version_number}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            /* ── NORMAL: Single video ── */
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
                                                        <DrawingCanvas
                                                            ref={drawingCanvasRef}
                                                            tool={["rect", "circle", "arrow", "line", "pen", "text", "select"].includes(activeTool) ? activeTool as any : null}
                                                            color={annotColor}
                                                            containerWidth={viewerSize.width}
                                                            containerHeight={viewerSize.height}
                                                            videoTimestamp={videoTime}
                                                            onShapesChange={setDrawingShapes}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ═══ VIDEO CONTROLS ═══ */}
                                        <div className="w-full bg-gradient-to-t from-[#15152a] to-transparent pt-6 pb-2 px-4 shrink-0 overflow-hidden">
                                            <div className="max-w-3xl mx-auto">
                                                {/* Progress bar with markers */}
                                                <div
                                                    className="h-2 bg-[#3a3a55] rounded-full cursor-pointer mb-4 group hover:h-3 transition-all relative"
                                                    onMouseDown={(e) => {
                                                        const bar = e.currentTarget;
                                                        const rect = bar.getBoundingClientRect();
                                                        const seek = (clientX: number) => {
                                                            const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                                                            if (videoRef.current) videoRef.current.currentTime = pos * videoDuration;
                                                        };
                                                        seek(e.clientX);
                                                        const onMove = (me: MouseEvent) => seek(me.clientX);
                                                        const onUp = () => {
                                                            window.removeEventListener("mousemove", onMove);
                                                            window.removeEventListener("mouseup", onUp);
                                                        };
                                                        window.addEventListener("mousemove", onMove);
                                                        window.addEventListener("mouseup", onUp);
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
                                                            data-tip={c.content.slice(0, 30)}
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

                                                {/* ═══ ANNOTATION TIMELINE TRACK ═══ */}
                                                {(() => {
                                                    const timedShapes = drawingShapes.filter(s => s.timestamp != null);
                                                    if (timedShapes.length === 0) return null;

                                                    const SHAPE_NAMES: Record<string, string> = {
                                                        rect: "Retângulo", circle: "Círculo", arrow: "Seta", line: "Linha", pen: "Desenho", text: "Texto",
                                                    };
                                                    const SHAPE_ICONS: Record<string, string> = {
                                                        rect: "□", circle: "○", arrow: "→", line: "╱", pen: "✎", text: "T",
                                                    };

                                                    // Layout: stack overlapping bars into rows
                                                    const ROW_H = 24; // px per row
                                                    const GAP = 2;
                                                    type LayoutItem = { shape: typeof timedShapes[0]; row: number; startPct: number; widthPct: number };
                                                    const layoutItems: LayoutItem[] = [];
                                                    const rowEnds: number[] = []; // track end% of each row

                                                    // Sort by start time
                                                    const sorted = [...timedShapes].sort((a, b) => (a.timestamp! - a.duration / 2) - (b.timestamp! - b.duration / 2));

                                                    for (const shape of sorted) {
                                                        const ts = shape.timestamp!;
                                                        const halfDur = shape.duration / 2;
                                                        const startPct = Math.max(0, ((ts - halfDur) / Math.max(videoDuration, 1)) * 100);
                                                        const endPct = Math.min(100, ((ts + halfDur) / Math.max(videoDuration, 1)) * 100);
                                                        const widthPct = Math.max(endPct - startPct, 1.5);

                                                        // Find first row where this item fits
                                                        let assignedRow = 0;
                                                        for (let r = 0; r < rowEnds.length; r++) {
                                                            if (startPct >= rowEnds[r]) { assignedRow = r; break; }
                                                            assignedRow = r + 1;
                                                        }
                                                        if (assignedRow >= rowEnds.length) rowEnds.push(0);
                                                        rowEnds[assignedRow] = startPct + widthPct + 0.3;
                                                        layoutItems.push({ shape, row: assignedRow, startPct, widthPct });
                                                    }

                                                    const totalRows = Math.max(1, rowEnds.length);
                                                    const MAX_VISIBLE_ROWS = 3;
                                                    const rowH = ROW_H + GAP;
                                                    const trackH = totalRows * rowH + 4;
                                                    const maxTrackH = MAX_VISIBLE_ROWS * rowH + 4;
                                                    const needsScroll = totalRows > MAX_VISIBLE_ROWS;

                                                    return (
                                                        <div className="mb-2">
                                                            {/* Header */}
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Anotações</span>
                                                                <span className="text-[9px] bg-[#2a2a40] text-zinc-400 px-1.5 py-0.5 rounded font-mono">{timedShapes.length}</span>
                                                            </div>
                                                            {/* Timeline track */}
                                                            <div
                                                                className={`bg-[#12122a] rounded-md relative border border-[#2a2a40]/60 select-none ${needsScroll ? "overflow-y-auto viewer-no-scrollbar" : ""}`}
                                                                style={{ height: needsScroll ? maxTrackH : trackH }}
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const pos = (e.clientX - rect.left) / rect.width;
                                                                    if (videoRef.current) videoRef.current.currentTime = pos * videoDuration;
                                                                }}
                                                            >
                                                                {/* Scrollable inner content */}
                                                                <div className="relative" style={{ height: trackH }}>
                                                                    {/* Playhead line */}
                                                                    <div
                                                                        className="absolute top-0 bottom-0 w-px bg-white/50 z-20 pointer-events-none"
                                                                        style={{ left: `${(videoTime / Math.max(videoDuration, 1)) * 100}%` }}
                                                                    >
                                                                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                                                                    </div>

                                                                    {/* Shape bars */}
                                                                    {layoutItems.map(({ shape, row, startPct, widthPct }) => {
                                                                        const ts = shape.timestamp!;
                                                                        const halfDur = shape.duration / 2;
                                                                        const isActive = Math.abs(videoTime - ts) < halfDur;
                                                                        const topPx = 2 + row * (ROW_H + GAP);

                                                                        return (
                                                                            <div
                                                                                key={shape.id}
                                                                                title={`${SHAPE_NAMES[shape.type] || shape.type} · ${formatTimestamp(ts)} · ${shape.duration.toFixed(1)}s | Arraste para mover, bordas para redimensionar`}
                                                                                className={`absolute rounded-[3px] flex items-center gap-1 px-1.5 text-[9px] font-semibold cursor-grab active:cursor-grabbing transition-opacity ${isActive ? "opacity-100 ring-1 ring-white/20" : "opacity-45 hover:opacity-75"}`}
                                                                                style={{
                                                                                    left: `${startPct}%`,
                                                                                    width: `${widthPct}%`,
                                                                                    top: topPx,
                                                                                    height: ROW_H,
                                                                                    backgroundColor: shape.color + "30",
                                                                                    borderLeft: `2px solid ${shape.color}`,
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (videoRef.current) videoRef.current.currentTime = ts;
                                                                                }}
                                                                                /* ── DRAG TO MOVE (change timestamp) ── */
                                                                                onMouseDown={(e) => {
                                                                                    // Only middle-area drag (not edge handles)
                                                                                    const barRect = e.currentTarget.getBoundingClientRect();
                                                                                    const relX = e.clientX - barRect.left;
                                                                                    if (relX < 6 || relX > barRect.width - 6) return; // let edge handles take over

                                                                                    e.stopPropagation();
                                                                                    e.preventDefault();
                                                                                    const startX = e.clientX;
                                                                                    const origTimestamp = ts;
                                                                                    const trackEl = e.currentTarget.parentElement!;
                                                                                    const trackRect = trackEl.getBoundingClientRect();
                                                                                    const pxPerSec = trackRect.width / Math.max(videoDuration, 1);

                                                                                    const onMove = (me: MouseEvent) => {
                                                                                        const dx = me.clientX - startX;
                                                                                        const dtSec = dx / pxPerSec;
                                                                                        const newTs = Math.max(shape.duration / 2, Math.min(videoDuration - shape.duration / 2, origTimestamp + dtSec));
                                                                                        drawingCanvasRef.current?.updateShape(shape.id, { timestamp: newTs });
                                                                                    };
                                                                                    const onUp = () => {
                                                                                        window.removeEventListener("mousemove", onMove);
                                                                                        window.removeEventListener("mouseup", onUp);
                                                                                    };
                                                                                    window.addEventListener("mousemove", onMove);
                                                                                    window.addEventListener("mouseup", onUp);
                                                                                }}
                                                                            >
                                                                                {/* Left resize handle */}
                                                                                <div
                                                                                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-w-resize hover:bg-white/20 rounded-l z-30"
                                                                                    onMouseDown={(e) => {
                                                                                        e.stopPropagation();
                                                                                        e.preventDefault();
                                                                                        const startX = e.clientX;
                                                                                        const origDur = shape.duration;
                                                                                        const origTs = ts;
                                                                                        const trackEl = e.currentTarget.closest("[style]")!.parentElement!;
                                                                                        const trackRect = trackEl.getBoundingClientRect();
                                                                                        const pxPerSec = trackRect.width / Math.max(videoDuration, 1);
                                                                                        const onMove = (me: MouseEvent) => {
                                                                                            const dx = me.clientX - startX;
                                                                                            const dtSec = dx / pxPerSec;
                                                                                            const newDur = Math.max(0.5, Math.min(60, origDur - dtSec));
                                                                                            const newTs = origTs + dtSec / 2;
                                                                                            drawingCanvasRef.current?.updateShape(shape.id, { duration: newDur, timestamp: Math.max(newDur / 2, newTs) });
                                                                                        };
                                                                                        const onUp = () => {
                                                                                            window.removeEventListener("mousemove", onMove);
                                                                                            window.removeEventListener("mouseup", onUp);
                                                                                        };
                                                                                        window.addEventListener("mousemove", onMove);
                                                                                        window.addEventListener("mouseup", onUp);
                                                                                    }}
                                                                                />

                                                                                {/* Label */}
                                                                                <span className="pointer-events-none select-none truncate" style={{ color: shape.color }}>
                                                                                    {SHAPE_ICONS[shape.type] || "●"}
                                                                                </span>
                                                                                <span className="pointer-events-none select-none truncate text-zinc-400 text-[8px]">
                                                                                    {shape.label || SHAPE_NAMES[shape.type] || shape.type}
                                                                                </span>

                                                                                {/* Right resize handle */}
                                                                                <div
                                                                                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-e-resize hover:bg-white/20 rounded-r z-30"
                                                                                    onMouseDown={(e) => {
                                                                                        e.stopPropagation();
                                                                                        e.preventDefault();
                                                                                        const startX = e.clientX;
                                                                                        const origDur = shape.duration;
                                                                                        const origTs = ts;
                                                                                        const trackEl = e.currentTarget.closest("[style]")!.parentElement!;
                                                                                        const trackRect = trackEl.getBoundingClientRect();
                                                                                        const pxPerSec = trackRect.width / Math.max(videoDuration, 1);
                                                                                        const onMove = (me: MouseEvent) => {
                                                                                            const dx = me.clientX - startX;
                                                                                            const dtSec = dx / pxPerSec;
                                                                                            const newDur = Math.max(0.5, Math.min(60, origDur + dtSec));
                                                                                            const newTs = origTs + dtSec / 2;
                                                                                            drawingCanvasRef.current?.updateShape(shape.id, { duration: newDur, timestamp: Math.max(newDur / 2, newTs) });
                                                                                        };
                                                                                        const onUp = () => {
                                                                                            window.removeEventListener("mousemove", onMove);
                                                                                            window.removeEventListener("mouseup", onUp);
                                                                                        };
                                                                                        window.addEventListener("mousemove", onMove);
                                                                                        window.addEventListener("mouseup", onUp);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div> {/* end scrollable inner */}
                                                            </div>
                                                            {/* Hint */}
                                                            <p className="text-[9px] text-zinc-600 mt-0.5">Arraste para mover · Bordas para redimensionar</p>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Controls row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={toggleMute} className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer" data-tip={isMuted ? "Ativar som" : "Silenciar"}>
                                                            {isMuted ? (
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V18.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        <span className="text-[13px] text-zinc-300 font-mono tracking-wide">
                                                            {formatTimestamp(videoTime)} <span className="text-zinc-600">/</span> {formatTimestamp(videoDuration)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => stepFrame(-1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] text-[16px] transition-colors cursor-pointer" data-tip="Frame anterior">&#60;</button>
                                                        <button onClick={togglePlay} className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg cursor-pointer" data-tip="Reproduzir / Pausar">
                                                            {isPlaying ? (
                                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                                            ) : (
                                                                <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                            )}
                                                        </button>
                                                        <button onClick={() => stepFrame(1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] text-[16px] transition-colors cursor-pointer" data-tip="Próximo frame">&#62;</button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={cycleSpeed} className="text-[13px] text-zinc-400 hover:text-zinc-200 font-mono transition-colors px-2 py-1 rounded-lg hover:bg-[#2a2a40] cursor-pointer" data-tip="Velocidade de reprodução">
                                                            {playbackSpeed}x
                                                        </button>
                                                        <button onClick={takeScreenshot} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer" data-tip="Captura de tela do frame atual">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => videoRef.current?.requestFullscreen?.()}
                                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors cursor-pointer"
                                                            data-tip="Tela cheia"
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
                    <div className="w-[360px] border-l border-[#2a2a40] bg-[#1a1a2e] flex flex-col shrink-0 overflow-hidden">
                        {/* Sidebar tabs */}
                        <div className="flex border-b border-[#2a2a40] shrink-0">
                            <button
                                onClick={() => setSidebarTab("comments")}
                                className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors cursor-pointer ${sidebarTab === "comments" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                                💬 Comentários
                            </button>
                            <button
                                onClick={() => setSidebarTab("activity")}
                                className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors cursor-pointer ${sidebarTab === "activity" ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/5" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                                🕐 Atividade
                            </button>
                        </div>

                        {sidebarTab === "comments" ? (
                            <>
                                {/* Carry comments forward button */}
                                {selectedVersion && versions.length > 1 && selectedVersion.id === versions[0]?.id && (
                                    <div className="px-3 py-2 border-b border-[#2a2a40] bg-[#15152a]">
                                        <button
                                            onClick={async () => {
                                                const prevVersion = versions[1];
                                                if (!prevVersion) return;
                                                const result = await carryCommentsForward(prevVersion.id, selectedVersion.id, proof.id);
                                                if (result.count > 0) {
                                                    refreshComments();
                                                    logActivity({ proofId: proof.id, action: "comments_carried", metadata: { count: result.count, from_version: prevVersion.version_number } });
                                                    toast(`${result.count} comentário(s) copiado(s) da versão anterior!`, "success");
                                                } else {
                                                    toast("Nenhum comentário aberto na versão anterior para copiar.", "info");
                                                }
                                            }}
                                            className="w-full h-8 rounded-md flex items-center justify-center gap-2 text-[11px] font-semibold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-colors cursor-pointer"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                            </svg>
                                            Copiar comentários da V.{versions[1]?.version_number}
                                        </button>
                                    </div>
                                )}
                                <CommentPanel
                                    comments={comments}
                                    versionId={selectedVersion?.id || ""}
                                    proofId={proof.id}
                                    proofTitle={proof.title}
                                    currentUserId={currentUserId}
                                    activePinId={activePinId}
                                    pendingPin={pendingPin}
                                    videoTimestamp={fileCategory === "video" ? videoTime : null}
                                    onCommentCreated={refreshComments}
                                    onPinClick={(id) => setActivePinId(id)}
                                    onCancelPin={() => setPendingPin(null)}
                                    orgMembers={orgMembers}
                                />
                            </>
                        ) : (
                            <ActivityLogPanel proofId={proof.id} />
                        )}
                    </div>
                )}
            </div>

            {/* Powered by badge */}
            <div className="h-6 flex items-center px-3 bg-[#15152a] border-t border-[#2a2a40] shrink-0">
                <span className="text-[10px] text-zinc-600">Powered by GorillaProof®</span>
            </div>

            {/* Share Dialog */}
            <ShareDialog
                isOpen={showShareDialog}
                onClose={() => setShowShareDialog(false)}
                proofId={proof.id}
                proofTitle={proof.title}
            />

            {/* ═══ KEYBOARD SHORTCUTS OVERLAY ═══ */}
            {showShortcuts && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
                    <div className="bg-[#1a1a2e] border border-[#2a2a40] rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2a40]">
                            <h2 className="text-[14px] font-bold text-white">Atalhos do Teclado</h2>
                            <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-white text-lg cursor-pointer">✕</button>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5 text-[12px]">
                            {/* Video */}
                            <div className="col-span-2">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Reprodução de Vídeo</h3>
                            </div>
                            {[
                                ["Space / K", "Reproduzir / Pausar"],
                                ["J", "Retroceder 5s"],
                                ["L", "Avançar 5s"],
                                ["← / →", "Passo de frame (±1)"],
                                ["Shift + ← / →", "Pular ±0.5s"],
                                ["M", "Silenciar / Som"],
                                ["F", "Tela cheia"],
                                ["1–9", "Ir para 10%–90%"],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-zinc-400">{desc}</span>
                                    <kbd className="bg-[#2a2a40] text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono border border-[#3a3a55]">{key}</kbd>
                                </div>
                            ))}

                            {/* Canvas */}
                            <div className="col-span-2 mt-2">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Canvas e Desenho</h3>
                            </div>
                            {[
                                ["Ctrl+Z", "Desfazer"],
                                ["Ctrl+Shift+Z", "Refazer"],
                                ["Delete", "Excluir seleção"],
                                ["A", "Alternar anotações"],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-zinc-400">{desc}</span>
                                    <kbd className="bg-[#2a2a40] text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono border border-[#3a3a55]">{key}</kbd>
                                </div>
                            ))}

                            {/* General */}
                            <div className="col-span-2 mt-2">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Geral</h3>
                            </div>
                            {[
                                ["+ / −", "Zoom +/−"],
                                ["0", "Zoom 100%"],
                                ["Escape", "Fechar menus"],
                                ["?", "Este painel"],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-zinc-400">{desc}</span>
                                    <kbd className="bg-[#2a2a40] text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono border border-[#3a3a55]">{key}</kbd>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-3 border-t border-[#2a2a40] text-center">
                            <span className="text-[10px] text-zinc-600">Press <kbd className="bg-[#2a2a40] px-1.5 py-0.5 rounded text-zinc-400 font-mono border border-[#3a3a55]">?</kbd> to toggle · <kbd className="bg-[#2a2a40] px-1.5 py-0.5 rounded text-zinc-400 font-mono border border-[#3a3a55]">Esc</kbd> to close</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
