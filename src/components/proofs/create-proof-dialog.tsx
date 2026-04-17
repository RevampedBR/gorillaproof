"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProof } from "@/lib/actions/proofs";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

interface CreateProofDialogProps {
    clientId: string;
    projectId?: string;
    clientName?: string;
    projectName?: string;
    children: React.ReactNode;
}

const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/tiff",
    "video/mp4", "video/quicktime", "video/webm",
    "application/pdf",
    "image/vnd.adobe.photoshop",
];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.gif,.webp,.svg,.tiff,.psd,.mp4,.mov,.webm,.pdf";
const MAX_SIZE = 250 * 1024 * 1024; // 250MB

function getFileIcon(type: string) {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type === "application/pdf") return "📄";
    return "📎";
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripExtension(filename: string) {
    return filename.replace(/\.[^/.]+$/, "");
}

export function CreateProofDialog({ clientId, projectId, clientName, projectName, children }: CreateProofDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [files, setFiles] = useState<File[]>([]);
    const [title, setTitle] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [allowComments, setAllowComments] = useState(true);
    const [allowDownload, setAllowDownload] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const needsProject = !projectId;

    const resetForm = useCallback(() => {
        setFiles([]);
        setTitle("");
        setError(null);
        setAllowComments(true);
        setAllowDownload(false);
    }, []);

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) resetForm();
    };

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const valid: File[] = [];
        for (const file of Array.from(newFiles)) {
            if (file.size > MAX_SIZE) {
                setError(`"${file.name}" excede 250MB`);
                continue;
            }
            valid.push(file);
        }
        setFiles(prev => {
            const updated = [...prev, ...valid];
            // Auto-fill title from first file if title is empty
            if (updated.length > 0 && !title) {
                setTitle(stripExtension(updated[0].name));
            }
            return updated;
        });
    }, [title]);

    const removeFile = (index: number) => {
        setFiles(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0 && title === stripExtension(prev[0]?.name || "")) {
                setTitle("");
            }
            return updated;
        });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    }, [addFiles]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!title.trim()) { setError("Título é obrigatório"); return; }
        if (files.length === 0) { setError("Envie pelo menos um arquivo"); return; }
        setError(null);

        const formData = new FormData();
        formData.set("title", title.trim());
        for (const file of files) {
            formData.append("files", file);
        }

        startTransition(async () => {
            const result = await createProof(clientId, formData, projectId || null);
            if (result?.error) {
                setError(result.error);
            } else {
                setOpen(false);
                resetForm();
                if (result.id) router.push(`/proofs/${result.id}`);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    {(clientName || projectName) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium mb-1">
                            {clientName && (
                                <>
                                    <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    <span className="text-zinc-400">{clientName}</span>
                                </>
                            )}
                            {clientName && projectName && (
                                <svg className="h-2.5 w-2.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            )}
                            {projectName && (
                                <>
                                    <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                    </svg>
                                    <span className="text-zinc-400">{projectName}</span>
                                </>
                            )}
                        </div>
                    )}
                    <DialogTitle className="text-xl font-bold text-zinc-100">
                        Nova Prova
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {needsProject
                            ? "Para criar uma prova, você precisa ter pelo menos um projeto."
                            : "Envie o arquivo, defina o nome e as permissões."}
                    </DialogDescription>
                </DialogHeader>

                {needsProject ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-[14px] text-zinc-300 font-medium">Crie um projeto primeiro</p>
                            <p className="text-[12px] text-zinc-500 mt-1 max-w-xs">
                                Toda prova precisa estar dentro de um projeto. Crie um projeto para depois adicionar provas a ele.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                                Cancelar
                            </Button>
                            <CreateProjectDialog clientId={clientId}>
                                <Button type="button" className="text-white font-medium" style={{ backgroundColor: 'var(--brand)' }} onClick={() => setOpen(false)}>
                                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Criar Projeto
                                </Button>
                            </CreateProjectDialog>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-4 pt-1">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* ═══ UPLOAD ZONE ═══ */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative cursor-pointer rounded-xl border-2 border-dashed transition-all
                                ${dragOver
                                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                                    : files.length > 0
                                        ? "border-zinc-700/50 bg-zinc-900/30"
                                        : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50"
                                }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_EXTENSIONS}
                                className="hidden"
                                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                            />

                            {files.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-8 px-4">
                                    <div className="h-12 w-12 rounded-xl bg-zinc-800/80 flex items-center justify-center">
                                        <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[13px] text-zinc-300 font-medium">
                                            Arraste arquivos aqui ou clique para selecionar
                                        </p>
                                        <p className="text-[11px] text-zinc-500 mt-1">
                                            JPG, PNG, GIF, WEBP, SVG, PSD, MP4, MOV, WEBM, PDF — Máx 250MB
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="flex items-center gap-3 bg-zinc-800/40 rounded-lg px-3 py-2.5">
                                            <span className="text-lg shrink-0">{getFileIcon(file.type)}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] text-zinc-200 font-medium truncate">{file.name}</p>
                                                <p className="text-[11px] text-zinc-500">{formatSize(file.size)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                className="shrink-0 h-6 w-6 rounded-md hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-center pt-1 pb-1">
                                        <span className="text-[11px] text-zinc-500">Clique ou arraste para adicionar mais arquivos</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ TITLE ═══ */}
                        <div className="grid gap-2">
                            <Label htmlFor="proof-title" className="text-zinc-300 text-sm">
                                Nome da prova
                            </Label>
                            <Input
                                id="proof-title"
                                name="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Banner Principal - v1"
                                required
                                className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-[var(--brand)]"
                            />
                            {files.length > 0 && title === stripExtension(files[0].name) && (
                                <p className="text-[11px] text-zinc-500 -mt-1">Nome sugerido a partir do arquivo. Edite se quiser.</p>
                            )}
                        </div>

                        {/* ═══ PERMISSIONS ═══ */}
                        <div className="grid gap-2.5">
                            <Label className="text-zinc-300 text-sm">Permissões</Label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Allow comments */}
                                <button
                                    type="button"
                                    onClick={() => setAllowComments(v => !v)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left ${
                                        allowComments
                                            ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                                    }`}
                                >
                                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        allowComments ? "border-[var(--brand)] bg-[var(--brand)]" : "border-zinc-600"
                                    }`}>
                                        {allowComments && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[12px] text-zinc-200 font-medium">Comentários</p>
                                        <p className="text-[10px] text-zinc-500">Revisores podem comentar</p>
                                    </div>
                                </button>

                                {/* Allow download */}
                                <button
                                    type="button"
                                    onClick={() => setAllowDownload(v => !v)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left ${
                                        allowDownload
                                            ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                                    }`}
                                >
                                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        allowDownload ? "border-[var(--brand)] bg-[var(--brand)]" : "border-zinc-600"
                                    }`}>
                                        {allowDownload && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[12px] text-zinc-200 font-medium">Download</p>
                                        <p className="text-[10px] text-zinc-500">Permitir baixar arquivo</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* ═══ ACTIONS ═══ */}
                        <div className="flex justify-end gap-3 pt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleOpenChange(false)}
                                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || files.length === 0}
                                className="text-white font-medium disabled:opacity-40"
                                style={{ backgroundColor: 'var(--brand)' }}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Enviando...
                                    </span>
                                ) : (
                                    "Criar Prova"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
