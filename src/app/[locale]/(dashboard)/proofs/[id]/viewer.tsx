"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload/dropzone";
import { getSignedUrl, getFileCategory } from "@/lib/storage";
import { useRouter } from "@/i18n/navigation";

interface ProofViewerProps {
    proof: any;
    versions: any[];
    projectName: string;
    orgId: string;
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

export function ProofViewer({ proof, versions, projectName, orgId }: ProofViewerProps) {
    const t = useTranslations("dashboard.viewer");
    const tp = useTranslations("dashboard.projects");
    const router = useRouter();
    const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [showUploadZone, setShowUploadZone] = useState(versions.length === 0);
    const [compareMode, setCompareMode] = useState(false);
    const [compareVersion, setCompareVersion] = useState<any>(versions[1] || null);
    const [compareUrl, setCompareUrl] = useState<string>("");
    const [zoom, setZoom] = useState(1);

    // Load signed URL when version changes
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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && selectedVersion) {
                const idx = versions.findIndex((v: any) => v.id === selectedVersion.id);
                if (idx < versions.length - 1) setSelectedVersion(versions[idx + 1]);
            }
            if (e.key === "ArrowRight" && selectedVersion) {
                const idx = versions.findIndex((v: any) => v.id === selectedVersion.id);
                if (idx > 0) setSelectedVersion(versions[idx - 1]);
            }
            if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 5));
            if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.25));
            if (e.key === "0") setZoom(1);
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [selectedVersion, versions]);

    const fileCategory = selectedVersion ? getFileCategory(selectedVersion.file_type) : "unknown";

    const handleUploadComplete = useCallback(() => {
        router.refresh();
        setShowUploadZone(false);
    }, [router]);

    return (
        <div className="flex flex-col h-full">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link
                        href={`/projects/${proof.project_id}`}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[15px] font-semibold text-zinc-100 truncate">{proof.title}</h1>
                            <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0 shrink-0 ${STATUS_COLORS[proof.status]}`}
                            >
                                {tp(STATUS_LABELS[proof.status] || "draft")}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">
                            {projectName} · {selectedVersion ? `v${selectedVersion.version_number}` : t("noVersions")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {versions.length > 1 && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCompareMode(!compareMode)}
                            className={`h-7 text-[11px] ${compareMode ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:text-zinc-200"}`}
                        >
                            <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            {t("compare")}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowUploadZone(!showUploadZone)}
                        className="h-7 text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                        <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        {t("uploadVersion")}
                    </Button>

                    {/* Zoom Controls */}
                    {fileCategory === "image" && (
                        <div className="flex items-center gap-1 ml-2 border-l border-zinc-800 pl-2">
                            <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))} className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-[14px]">−</button>
                            <span className="text-[10px] text-zinc-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))} className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-[14px]">+</button>
                            <button onClick={() => setZoom(1)} className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono">1:1</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Viewer Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                    {/* Upload Zone (Collapsible) */}
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

                    {/* Main Viewer */}
                    <div className="flex-1 flex items-center justify-center overflow-auto p-4">
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
                            /* Side-by-Side Compare */
                            <div className="flex gap-1 h-full w-full items-center justify-center">
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 mb-2 font-mono">v{compareVersion?.version_number}</span>
                                    <div className="overflow-auto max-h-full rounded-lg border border-zinc-800/40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={compareUrl} alt="Previous version" className="max-w-full h-auto" />
                                    </div>
                                </div>
                                <div className="w-px bg-emerald-500/30 self-stretch mx-1" />
                                <div className="flex-1 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 mb-2 font-mono">v{selectedVersion.version_number}</span>
                                    <div className="overflow-auto max-h-full rounded-lg border border-zinc-800/40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fileUrl} alt="Current version" className="max-w-full h-auto" />
                                    </div>
                                </div>
                            </div>
                        ) : fileUrl ? (
                            /* Single File Viewer */
                            <div className="flex items-center justify-center overflow-auto w-full h-full">
                                {fileCategory === "image" && (
                                    <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})` }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={fileUrl}
                                            alt={proof.title}
                                            className="max-w-none rounded shadow-2xl"
                                            draggable={false}
                                        />
                                    </div>
                                )}
                                {fileCategory === "video" && (
                                    <video
                                        src={fileUrl}
                                        controls
                                        className="max-w-full max-h-full rounded shadow-2xl"
                                        style={{ maxHeight: "calc(100vh - 200px)" }}
                                    />
                                )}
                                {fileCategory === "pdf" && (
                                    <iframe
                                        src={fileUrl}
                                        className="w-full h-full rounded border border-zinc-800"
                                        title={proof.title}
                                    />
                                )}
                                {(fileCategory === "design" || fileCategory === "unknown") && (
                                    <div className="text-center">
                                        <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 mx-auto">
                                            <span className="text-3xl">🎨</span>
                                        </div>
                                        <p className="text-[14px] text-zinc-400 font-medium">{t("previewUnavailable")}</p>
                                        <a
                                            href={fileUrl}
                                            download
                                            className="text-[12px] text-emerald-400 hover:text-emerald-300 mt-2 inline-block underline underline-offset-4"
                                        >
                                            {t("downloadFile")}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-pulse flex items-center justify-center">
                                <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Version Sidebar */}
                {versions.length > 0 && (
                    <div className="w-56 border-l border-zinc-800/60 bg-zinc-950/90 flex flex-col shrink-0">
                        <div className="p-3 border-b border-zinc-800/40">
                            <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                {t("versions")} ({versions.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {versions.map((v: any) => (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        if (compareMode) {
                                            setCompareVersion(v);
                                        } else {
                                            setSelectedVersion(v);
                                        }
                                    }}
                                    className={`
                                        w-full text-left rounded-lg p-2.5 transition-all group
                                        ${(selectedVersion?.id === v.id && !compareMode) ||
                                            (compareMode && compareVersion?.id === v.id)
                                            ? "bg-emerald-500/10 border border-emerald-500/20"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`text-[12px] font-bold font-mono ${selectedVersion?.id === v.id ? "text-emerald-400" : "text-zinc-300"
                                                }`}
                                        >
                                            v{v.version_number}
                                        </span>
                                        <span className="text-[10px] text-zinc-600">
                                            {getFileCategory(v.file_type) === "image"
                                                ? "🖼️"
                                                : getFileCategory(v.file_type) === "video"
                                                    ? "🎬"
                                                    : getFileCategory(v.file_type) === "pdf"
                                                        ? "📄"
                                                        : "📁"}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-600">
                                        {new Date(v.created_at).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
