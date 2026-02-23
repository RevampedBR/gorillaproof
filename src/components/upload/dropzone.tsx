"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { uploadProofFile, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, getFileCategory } from "@/lib/storage";
import { createVersion } from "@/lib/actions/versions";

interface UploadDropzoneProps {
    orgId: string;
    projectId: string;
    proofId: string;
    currentVersionNumber: number;
    onUploadComplete?: () => void;
}

interface FileUploadState {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

export function UploadDropzone({
    orgId,
    projectId,
    proofId,
    currentVersionNumber,
    onUploadComplete,
}: UploadDropzoneProps) {
    const t = useTranslations("dashboard.upload");
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<FileUploadState[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const validateFile = (file: File): string | null => {
        if (file.size > MAX_FILE_SIZE) {
            return t("fileTooLarge");
        }
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            return t("unsupportedFormat");
        }
        return null;
    };

    const processFiles = useCallback(
        async (fileList: File[]) => {
            const newFiles: FileUploadState[] = fileList.map((f) => ({
                file: f,
                progress: 0,
                status: "pending" as const,
            }));

            setFiles(newFiles);
            setIsUploading(true);

            let versionNum = currentVersionNumber;

            for (let i = 0; i < newFiles.length; i++) {
                const fileState = newFiles[i];
                const validationError = validateFile(fileState.file);

                if (validationError) {
                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i ? { ...f, status: "error" as const, error: validationError } : f
                        )
                    );
                    continue;
                }

                // Mark as uploading
                setFiles((prev) =>
                    prev.map((f, idx) =>
                        idx === i ? { ...f, status: "uploading" as const, progress: 10 } : f
                    )
                );

                versionNum++;

                // Upload to Supabase Storage
                const result = await uploadProofFile(
                    orgId,
                    projectId,
                    proofId,
                    versionNum,
                    fileState.file
                );

                if (result.error) {
                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i ? { ...f, status: "error" as const, error: result.error! } : f
                        )
                    );
                    continue;
                }

                // Progress: file uploaded
                setFiles((prev) =>
                    prev.map((f, idx) =>
                        idx === i ? { ...f, progress: 80 } : f
                    )
                );

                // Create version record in DB
                const versionResult = await createVersion(
                    proofId,
                    result.path,
                    fileState.file.type,
                    projectId
                );

                if (versionResult.error) {
                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i
                                ? { ...f, status: "error" as const, error: versionResult.error! }
                                : f
                        )
                    );
                    continue;
                }

                // Mark complete
                setFiles((prev) =>
                    prev.map((f, idx) =>
                        idx === i ? { ...f, status: "success" as const, progress: 100 } : f
                    )
                );
            }

            setIsUploading(false);
            onUploadComplete?.();
        },
        [orgId, projectId, proofId, currentVersionNumber, onUploadComplete, t]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = Array.from(e.dataTransfer.files);
            if (dropped.length > 0) processFiles(dropped);
        },
        [processFiles]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length > 0) processFiles(selected);
        e.target.value = "";
    };

    const getCategoryIcon = (file: File) => {
        const cat = getFileCategory(file.type);
        switch (cat) {
            case "image":
                return "🖼️";
            case "video":
                return "🎬";
            case "pdf":
                return "📄";
            case "design":
                return "🎨";
            default:
                return "";
        }
    };

    return (
        <div className="space-y-3">
            {/* Dropzone Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
                    ${isDragging
                        ? "border-emerald-400 bg-emerald-500/5 scale-[1.01] shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                        : "border-zinc-700/50 bg-zinc-900/20 hover:border-zinc-600 hover:bg-zinc-900/40"
                    }
                `}
                onClick={() => document.getElementById(`file-input-${proofId}`)?.click()}
            >
                <input
                    id={`file-input-${proofId}`}
                    type="file"
                    multiple
                    accept={ACCEPTED_EXTENSIONS.join(",")}
                    onChange={handleFileInput}
                    className="hidden"
                />

                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    {/* Upload Icon with pulse animation */}
                    <div
                        className={`
                            h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300
                            ${isDragging ? "bg-emerald-500/20 scale-110" : "bg-zinc-800/80"}
                        `}
                    >
                        <svg
                            className={`h-6 w-6 transition-colors ${isDragging ? "text-emerald-400" : "text-zinc-400"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                            />
                        </svg>
                    </div>

                    <p className="text-[13px] font-medium text-zinc-300 mb-1">
                        {isDragging ? t("dropHere") : t("dragOrClick")}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                        {t("supportedFormats")}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                        {t("maxSize")}
                    </p>
                </div>
            </div>

            {/* File Upload Progress */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((f, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-3"
                        >
                            <span className="text-lg shrink-0">{getCategoryIcon(f.file)}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[12px] font-medium text-zinc-300 truncate pr-2">
                                        {f.file.name}
                                    </p>
                                    <span
                                        className={`text-[10px] font-medium shrink-0 ${f.status === "success"
                                            ? "text-emerald-400"
                                            : f.status === "error"
                                                ? "text-red-400"
                                                : "text-zinc-500"
                                            }`}
                                    >
                                        {f.status === "success"
                                            ? "✓"
                                            : f.status === "error"
                                                ? f.error
                                                : f.status === "uploading"
                                                    ? `${f.progress}%`
                                                    : t("waiting")}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ease-out ${f.status === "success"
                                            ? "bg-emerald-500"
                                            : f.status === "error"
                                                ? "bg-red-500"
                                                : "bg-emerald-500/70"
                                            }`}
                                        style={{ width: `${f.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
