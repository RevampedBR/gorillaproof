"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProof } from "@/lib/actions/proofs";
import { getProjects } from "@/lib/actions/projects";

interface NewProofModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewProofModal({ open, onOpenChange }: NewProofModalProps) {
    const [title, setTitle] = useState("");
    const [projectId, setProjectId] = useState("");
    const [projects, setProjects] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Load projects when modal opens
    useEffect(() => {
        if (open) {
            getProjects().then(({ data }) => {
                setProjects(data || []);
                if (data?.length > 0 && !projectId) {
                    setProjectId(data[0].id);
                }
            });
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Proof title is required");
            return;
        }
        if (!projectId) {
            setError("Select a project first");
            return;
        }
        setError(null);

        const formData = new FormData();
        formData.set("title", title.trim());

        startTransition(async () => {
            try {
                const result = await createProof(projectId, formData);
                if (result?.error) {
                    setError(result.error);
                } else {
                    setTitle("");
                    onOpenChange(false);
                }
            } catch {
                setError("Failed to create proof. Try again.");
            }
        });
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
        >
            <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
                    <h2 className="text-[15px] font-semibold text-zinc-100">New Proof</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="proof-title" className="text-[13px] font-medium text-zinc-300">
                            Title
                        </Label>
                        <Input
                            id="proof-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Banner Hero v2, Instagram Stories Pack"
                            className="h-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                            autoFocus
                        />
                    </div>

                    {/* Project selector */}
                    <div className="space-y-2">
                        <Label htmlFor="proof-project" className="text-[13px] font-medium text-zinc-300">
                            Project
                        </Label>
                        {projects.length > 0 ? (
                            <select
                                id="proof-project"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full h-10 rounded-md bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-[13px] px-3 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                                {projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-[12px] text-zinc-500 italic py-2">
                                No projects yet. Create a project first.
                            </p>
                        )}
                    </div>

                    {/* Upload zone (visual placeholder) */}
                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-zinc-700 transition-colors cursor-pointer">
                        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-zinc-800/60 flex items-center justify-center">
                            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <p className="text-[13px] text-zinc-400 font-medium">
                            Drag & drop files here
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-1">
                            or click to browse. Supports images, videos, PDFs.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-400 hover:text-zinc-200 text-[13px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] px-4"
                        >
                            {isPending ? "Creating..." : "Create Proof"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
