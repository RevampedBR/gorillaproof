"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProof } from "@/lib/actions/proofs";
import { getProjects } from "@/lib/actions/projects";
import { FolderKanban, Users, Type, X, UploadCloud, ChevronDown } from "lucide-react";

interface NewProofModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewProofModal({ open, onOpenChange }: NewProofModalProps) {
    const t = useTranslations("dashboard.projects");

    const [title, setTitle] = useState("");
    const [projectId, setProjectId] = useState("");
    const [clientId, setClientId] = useState("all");
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

    // Extract unique clients from projects
    const clients = useMemo(() => {
        const map = new Map();
        projects.forEach(p => {
            if (p.client) {
                map.set(p.client.id, p.client);
            }
        });
        return Array.from(map.values());
    }, [projects]);

    const filteredProjects = useMemo(() => {
        if (clientId === "all") return projects;
        if (clientId === "none") return projects.filter(p => !p.client);
        return projects.filter(p => p.client?.id === clientId);
    }, [projects, clientId]);

    // Update projectId when filteredProjects changes
    useEffect(() => {
        if (filteredProjects.length > 0) {
            if (!filteredProjects.find(p => p.id === projectId)) {
                setProjectId(filteredProjects[0].id);
            }
        } else {
            setProjectId("");
        }
    }, [filteredProjects, projectId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError(t("titleRequired") || "O título da prova é obrigatório");
            return;
        }
        if (!projectId) {
            setError(t("projectRequired") || "Selecione um projeto primeiro");
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
                setError("Falha ao criar prova. Tente novamente.");
            }
        });
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
        >
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60 bg-zinc-900/20">
                    <h2 className="text-[16px] font-semibold text-zinc-100 tracking-wide">Nova Prova (Proof)</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="proof-title" className="text-[12px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Type className="h-3.5 w-3.5 text-emerald-400" /> {t("proofTitle") || "Título da Prova"}
                        </Label>
                        <Input
                            id="proof-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("proofTitlePlaceholder") || "Ex: Banner Hero v2"}
                            className="h-11 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 rounded-xl"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Client selector */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="proof-client" className="text-[12px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-blue-400" /> Cliente
                            </Label>
                            <div className="relative">
                                <select
                                    id="proof-client"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-[13px] px-3 appearance-none focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all"
                                >
                                    <option value="all">Todos os Clientes</option>
                                    {clients.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="none">Sem Cliente (Geral)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Project selector */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="proof-project" className="text-[12px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <FolderKanban className="h-3.5 w-3.5 text-indigo-400" /> Projeto
                            </Label>
                            <div className="relative">
                                {filteredProjects.length > 0 ? (
                                    <select
                                        id="proof-project"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full h-11 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-[13px] px-3 appearance-none focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all"
                                    >
                                        {filteredProjects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="w-full h-11 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-500 text-[13px] px-3 flex items-center italic">
                                        Nenhum projeto...
                                    </div>
                                )}
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Upload zone (visual placeholder) */}
                    <div className="border border-dashed border-zinc-700/60 bg-zinc-900/20 rounded-xl p-8 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors cursor-pointer group mt-2">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-800/80 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                            <UploadCloud className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="text-[13px] text-zinc-300 font-medium tracking-wide">
                            Arraste & Solte os arquivos aqui
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1.5">
                            ou clique para navegar. (JPG, PNG, PDF, MP4)
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] px-3 py-2.5 rounded-lg flex items-center gap-2">
                            <X className="h-4 w-4 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-400 hover:text-zinc-200 text-[13px] h-10 px-5 rounded-lg hover:bg-zinc-800/60"
                        >
                            {t("cancel") || "Cancelar"}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || filteredProjects.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] h-10 px-6 rounded-lg font-semibold shadow-[0_0_20px_rgba(16,185,129,0.15)] disabled:opacity-50 transition-all"
                        >
                            {isPending ? "Criando..." : t("createProof") || "Criar Prova"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
