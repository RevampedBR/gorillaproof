"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoCropper } from "@/components/ui/logo-cropper";
import { createClient } from "@/utils/supabase/client";
import { createProof } from "@/lib/actions/proofs";
import { createProject, getProjects } from "@/lib/actions/projects";
import { createClientAction, getClients } from "@/lib/actions/clients";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, getFileCategory } from "@/lib/storage";
import { BananaUploadProgress, BananaSpinner } from "@/components/ui/banana-elements";

interface NewProofModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FilePreview {
    file: File;
    id: string;
    preview: string | null;
    category: "image" | "video" | "pdf" | "design" | "unknown";
}

interface Client { id: string; name: string; logo_url?: string | null; }
interface Project { id: string; name: string; client_id?: string; }

type Step = "loading" | "client" | "project" | "proof";
type SubMode = "select" | "create";
type UploadMode = "combined" | "separate";

export function NewProofModal({ open, onOpenChange }: NewProofModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("loading");
    const [clientMode, setClientMode] = useState<SubMode>("select");
    const [projectMode, setProjectMode] = useState<SubMode>("select");

    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");

    // New client fields
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [clientName, setClientName] = useState("");
    const [clientDesc, setClientDesc] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientSegment, setClientSegment] = useState("");

    // New project fields
    const [projectName, setProjectName] = useState("");
    const [projectDesc, setProjectDesc] = useState("");

    // Proof fields
    const [title, setTitle] = useState("");
    const [files, setFiles] = useState<FilePreview[]>([]);
    const [uploadMode, setUploadMode] = useState<UploadMode>("combined");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reset = () => {
        setStep("loading"); setClientMode("select"); setProjectMode("select");
        setSelectedClientId(""); setSelectedProjectId("");
        setLogoUrl(null); setClientName(""); setClientDesc(""); setClientEmail(""); setClientPhone(""); setClientSegment("");
        setProjectName(""); setProjectDesc("");
        setTitle(""); setFiles([]); setUploadMode("combined"); setError(null);
    };

    useEffect(() => {
        if (!open) { reset(); return; }
        startTransition(async () => {
            const [{ data: cls }, { data: projs }] = await Promise.all([getClients(), getProjects()]);
            const clientList = (cls as Client[]) || [];
            setClients(clientList);
            setProjects((projs as Project[]) || []);
            if (clientList.length === 0) {
                setClientMode("create");
            } else {
                setSelectedClientId(clientList[0].id);
                setClientMode("select");
            }
            setStep("client");
        });
    }, [open]);

    const handleLogoUpload = async (file: File) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: m } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single();
            if (!m) return;
            const path = `${m.organization_id}/logos/${Date.now()}.png`;
            const { error: e } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
            if (e) { setError("Erro ao enviar logo: " + e.message); return; }
            setLogoUrl(supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl);
        } catch { setError("Erro ao enviar logo"); }
    };

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const additions: FilePreview[] = [];
        Array.from(newFiles).forEach(file => {
            const ext = "." + file.name.split(".").pop()?.toLowerCase();
            if (!ACCEPTED_EXTENSIONS.includes(ext)) { setError(`Formato não suportado: ${ext}`); return; }
            if (file.size > MAX_FILE_SIZE) { setError(`Máx ${MAX_FILE_SIZE / 1048576}MB por arquivo`); return; }
            const cat = getFileCategory(file.type);
            additions.push({ file, id: `${file.name}-${Date.now()}`, preview: cat === "image" ? URL.createObjectURL(file) : null, category: cat });
        });
        if (additions.length) {
            setFiles(p => [...p, ...additions]); setError(null);
            if (!title && additions[0]) {
                const n = additions[0].file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
                setTitle(n.charAt(0).toUpperCase() + n.slice(1));
            }
        }
    }, [title]);

    const removeFile = (id: string) => setFiles(p => {
        const f = p.find(x => x.id === id);
        if (f?.preview) URL.revokeObjectURL(f.preview);
        const next = p.filter(x => x.id !== id);
        if (next.length <= 1) setUploadMode("combined");
        return next;
    });

    const handleClientCreate = () => {
        if (!clientName.trim()) { setError("Nome do cliente é obrigatório"); return; }
        setError(null);
        startTransition(async () => {
            const fd = new FormData();
            fd.set("name", clientName.trim());
            if (clientDesc) fd.set("description", clientDesc);
            if (clientEmail) fd.set("contact_email", clientEmail);
            if (clientPhone) fd.set("contact_phone", clientPhone);
            if (clientSegment) fd.set("segment", clientSegment);
            if (logoUrl) fd.set("logo_url", logoUrl);
            const res = await createClientAction(fd);
            if (res.error) { setError(res.error); return; }
            const { data: cls } = await getClients();
            setClients((cls as Client[]) || []);
            setSelectedClientId(res.id!);
            setProjectMode("create");
            setStep("project");
        });
    };

    const handleClientNext = () => {
        if (!selectedClientId) { setError("Selecione um cliente"); return; }
        setError(null);
        const clientProjects = projects.filter(p => p.client_id === selectedClientId);
        if (clientProjects.length === 0) { setProjectMode("create"); }
        else { setProjectMode("select"); setSelectedProjectId(clientProjects[0].id); }
        setStep("project");
    };

    const handleProjectCreate = () => {
        if (!projectName.trim()) { setError("Nome do projeto é obrigatório"); return; }
        setError(null);
        startTransition(async () => {
            const fd = new FormData();
            fd.set("name", projectName.trim());
            if (projectDesc) fd.set("description", projectDesc);
            fd.set("client_id", selectedClientId);
            const res = await createProject(fd);
            if (res.error) { setError(res.error); return; }
            const { data: projs } = await getProjects();
            const list = (projs as Project[]) || [];
            setProjects(list);
            const created = list.find(p => p.name.trim() === projectName.trim() && p.client_id === selectedClientId);
            setSelectedProjectId(created?.id || list[0]?.id || "");
            setStep("proof");
        });
    };

    const handleProjectNext = () => {
        if (!selectedProjectId) { setError("Selecione um projeto"); return; }
        setError(null);
        setStep("proof");
    };

    const handleSkipProject = () => {
        setSelectedProjectId("");
        setError(null);
        setStep("proof");
    };

    const handleProofSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Título é obrigatório"); return; }
        setError(null);

        if (uploadMode === "separate" && files.length > 1) {
            // Mode: create one proof per file
            startTransition(async () => {
                try {
                    let lastId: string | null = null;
                    for (const fp of files) {
                        const fd = new FormData();
                        const fname = fp.file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
                        fd.set("title", fname.charAt(0).toUpperCase() + fname.slice(1));
                        fd.append("files", fp.file);
                        const r = await createProof(selectedClientId, fd, selectedProjectId || null);
                        if (r?.error) { setError(r.error); return; }
                        if (r.id) lastId = r.id;
                    }
                    onOpenChange(false);
                    // Navigate to the client/project page instead of a single proof
                    if (selectedProjectId) {
                        router.push(`/clients/${selectedClientId}/projects/${selectedProjectId}`);
                    } else {
                        router.push(`/clients/${selectedClientId}`);
                    }
                } catch { setError("Falha ao criar provas."); }
            });
        } else {
            // Mode: combine all files into one proof (default)
            const fd = new FormData();
            fd.set("title", title.trim());
            files.forEach(f => fd.append("files", f.file));
            startTransition(async () => {
                try {
                    const r = await createProof(selectedClientId, fd, selectedProjectId || null);
                    if (r?.error) { setError(r.error); return; }
                    onOpenChange(false);
                    if (r.id) router.push(`/proofs/${r.id}`);
                } catch { setError("Falha ao criar prova."); }
            });
        }
    };

    const clientProjects = projects.filter(p => p.client_id === selectedClientId);
    const selectedClient = clients.find(c => c.id === selectedClientId);

    const stepIdx = step === "client" ? 0 : step === "project" ? 1 : step === "proof" ? 2 : -1;

    const fmt = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1048576).toFixed(1)}MB`;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
            <div className="w-full max-w-[480px] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="px-6 pt-5 pb-4 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-semibold text-zinc-100">Nova Prova</h2>
                        <button onClick={() => onOpenChange(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Step pills */}
                    {stepIdx >= 0 && (
                        <div className="flex items-center gap-2">
                            {["Cliente", "Projeto", "Prova"].map((label, i) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${i === stepIdx ? "bg-zinc-800 text-zinc-100" : i < stepIdx ? "text-emerald-500" : "text-zinc-600"}`}>
                                        {i < stepIdx
                                            ? <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            : <span className={`h-1.5 w-1.5 rounded-full ${i === stepIdx ? "bg-emerald-400" : "bg-zinc-700"}`} />
                                        }
                                        {label}
                                    </div>
                                    {i < 2 && <svg className="h-3 w-3 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

                    {/* ── Loading ──────────────────────────────────────── */}
                    {step === "loading" && (
                        <div className="flex justify-center py-8">
                            <BananaSpinner text="Preparando..." size={36} />
                        </div>
                    )}

                    {/* ── STEP 1: Cliente ──────────────────────────────── */}
                    {step === "client" && clientMode === "select" && (
                        <>
                            {/* Client list */}
                            <div className="space-y-1.5">
                                {clients.map(c => (
                                    <button key={c.id} onClick={() => setSelectedClientId(c.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${selectedClientId === c.id ? "border-emerald-500/50 bg-emerald-500/8 text-zinc-100" : "border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}>
                                        <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                                            {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[11px] font-bold text-zinc-300">{c.name[0].toUpperCase()}</span>}
                                        </div>
                                        <span className="text-[13.5px] font-medium flex-1 truncate">{c.name}</span>
                                        {selectedClientId === c.id && <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />}
                                    </button>
                                ))}
                            </div>

                            {/* Create new option */}
                            <button onClick={() => setClientMode("create")}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-[13px]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                Criar novo cliente
                            </button>

                            {error && <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">Cancelar</Button>
                                <Button size="sm" onClick={handleClientNext} disabled={!selectedClientId} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5">Continuar</Button>
                            </div>
                        </>
                    )}

                    {step === "client" && clientMode === "create" && (
                        <>
                            {clients.length > 0 && (
                                <button onClick={() => setClientMode("select")} className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                                    Selecionar existente
                                </button>
                            )}

                            {/* Logo */}
                            <LogoCropper onUpload={handleLogoUpload} currentLogoUrl={logoUrl} />

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-zinc-400 text-[12px] mb-1.5 block">Nome *</Label>
                                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Empresa XYZ" className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500" autoFocus />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-[12px] mb-1.5 block">Descrição</Label>
                                    <textarea value={clientDesc} onChange={e => setClientDesc(e.target.value)} placeholder="Breve descrição..." rows={2}
                                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-zinc-400 text-[12px] mb-1.5 block">E-mail</Label>
                                        <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="contato@..." className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-[12px] mb-1.5 block">Telefone</Label>
                                        <Input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(11) 9..." className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-[12px] mb-1.5 block">Segmento</Label>
                                    <select value={clientSegment} onChange={e => setClientSegment(e.target.value)}
                                        className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none">
                                        <option value="">Selecione...</option>
                                        <option value="publicidade">Publicidade</option>
                                        <option value="design">Design</option>
                                        <option value="moda">Moda</option>
                                        <option value="fotografia">Fotografia</option>
                                        <option value="audiovisual">Audiovisual</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            {error && <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">Cancelar</Button>
                                <Button size="sm" onClick={handleClientCreate} disabled={isPending || !clientName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">{isPending ? "Criando..." : "Criar e continuar"}</Button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 2: Projeto ──────────────────────────────── */}
                    {step === "project" && projectMode === "select" && (
                        <>
                            <div className="space-y-1.5">
                                {clientProjects.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProjectId(p.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${selectedProjectId === p.id ? "border-emerald-500/50 bg-emerald-500/8 text-zinc-100" : "border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}>
                                        <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                                        <span className="text-[13.5px] font-medium flex-1 truncate">{p.name}</span>
                                        {selectedProjectId === p.id && <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />}
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setProjectMode("create")}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-[13px]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                Criar novo projeto
                            </button>

                            <button onClick={handleSkipProject}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-zinc-800/60 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors text-[13px]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" /></svg>
                                Pular — sem projeto
                            </button>

                            {error && <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

                            <div className="flex justify-between gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => setStep("client")} className="text-zinc-400 hover:text-zinc-200">Voltar</Button>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">Cancelar</Button>
                                    <Button size="sm" onClick={handleProjectNext} disabled={!selectedProjectId} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5">Continuar</Button>
                                </div>
                            </div>
                        </>
                    )}

                    {step === "project" && projectMode === "create" && (
                        <>
                            {clientProjects.length > 0 && (
                                <button onClick={() => setProjectMode("select")} className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                                    Selecionar existente
                                </button>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-zinc-400 text-[12px] mb-1.5 block">Nome do projeto *</Label>
                                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Ex: Campanha Verão, Site Institucional..." className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500" autoFocus />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-[12px] mb-1.5 block">Descrição</Label>
                                    <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)} placeholder="Objetivo do projeto..." rows={3}
                                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
                                </div>
                            </div>

                            {error && <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

                            <div className="flex justify-between gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => setStep("client")} className="text-zinc-400 hover:text-zinc-200">Voltar</Button>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">Cancelar</Button>
                                    <Button size="sm" onClick={handleProjectCreate} disabled={isPending || !projectName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">{isPending ? "Criando..." : "Criar e continuar"}</Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── STEP 3: Prova ────────────────────────────────── */}
                    {step === "proof" && (
                        <form onSubmit={handleProofSubmit} className="space-y-4">
                            {/* Context badge */}
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
                                <span>{selectedClient?.name}</span>
                                {selectedProjectId && (
                                    <>
                                        <svg className="h-2.5 w-2.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                        <span>{projects.find(p => p.id === selectedProjectId)?.name}</span>
                                    </>
                                )}
                                {!selectedProjectId && (
                                    <span className="text-emerald-500/70 ml-1">· sem projeto</span>
                                )}
                            </div>

                            <div>
                                <Label className="text-zinc-400 text-[12px] mb-1.5 block">Título da prova *</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Banner Hero v2, Pack Stories..." className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500" autoFocus />
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? "border-emerald-500 bg-emerald-500/8" : files.length ? "border-zinc-700/50 bg-zinc-900/20" : "border-zinc-800 hover:border-zinc-700"}`}
                            >
                                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS.join(",")} onChange={e => e.target.files && addFiles(e.target.files)} className="hidden" />

                                {files.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-zinc-800/60 flex items-center justify-center">
                                            <svg className={`h-5 w-5 ${isDragging ? "text-emerald-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                        </div>
                                        <p className="text-[13px] font-medium text-zinc-400">{isDragging ? "Solte aqui" : "Arraste arquivos ou clique para selecionar"}</p>
                                        <p className="text-[11px] text-zinc-600 mt-1">Imagens, vídeos, PDFs</p>
                                    </div>
                                ) : (
                                    <div className="p-3" onClick={e => e.stopPropagation()}>
                                        <div className="grid grid-cols-4 gap-2">
                                            {files.map(f => (
                                                <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-700/40 bg-zinc-800/40">
                                                    {f.preview
                                                        ? <img src={f.preview} alt="" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex flex-col items-center justify-center">
                                                            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" /></svg>
                                                            <span className="text-[8px] text-zinc-500 mt-0.5">{f.file.name.split(".").pop()?.toUpperCase()}</span>
                                                        </div>
                                                    }
                                                    <button type="button" onClick={() => removeFile(f.id)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                    <div className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[8px] text-zinc-300">{fmt(f.file.size)}</div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-zinc-700/40 flex items-center justify-center hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors">
                                                <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 mt-2 text-center">{files.length} arquivo{files.length !== 1 ? "s" : ""}</p>
                                    </div>
                                )}
                            </div>

                            {/* Upload mode selector — only when 2+ files */}
                            {files.length > 1 && (
                                <div className="space-y-2">
                                    <p className="text-[12px] text-zinc-400 font-medium">Você está enviando vários arquivos. O que prefere que façamos?</p>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode("separate")}
                                            className={`relative flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border text-center transition-all ${uploadMode === "separate"
                                                ? "border-emerald-500/50 bg-emerald-500/8 text-zinc-100"
                                                : "border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                                }`}
                                        >
                                            <span className={`absolute top-2.5 left-2.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${uploadMode === "separate" ? "border-emerald-400" : "border-zinc-600"
                                                }`}>
                                                {uploadMode === "separate" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                                            </span>
                                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                            </svg>
                                            <span className="text-[12px] font-medium leading-tight">Provas separadas</span>
                                            <span className="text-[10px] text-zinc-500 leading-snug">Cada arquivo será uma prova independente</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUploadMode("combined")}
                                            className={`relative flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border text-center transition-all ${uploadMode === "combined"
                                                ? "border-emerald-500/50 bg-emerald-500/8 text-zinc-100"
                                                : "border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                                }`}
                                        >
                                            <span className={`absolute top-2.5 left-2.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${uploadMode === "combined" ? "border-emerald-400" : "border-zinc-600"
                                                }`}>
                                                {uploadMode === "combined" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                                            </span>
                                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                            <span className="text-[12px] font-medium leading-tight">Combinar em uma única revisão</span>
                                            <span className="text-[10px] text-zinc-500 leading-snug">Todos os arquivos serão páginas da mesma prova</span>
                                        </button>
                                    </div>
                                </div>
                            )}


                            {isPending && (
                                <BananaUploadProgress current={undefined} total={files.length || undefined} />
                            )}

                            {error && <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

                            <div className="flex justify-between gap-2 pt-1">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setStep("project")} className="text-zinc-400 hover:text-zinc-200">Voltar</Button>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">Cancelar</Button>
                                    <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">{isPending ? "Criando..." : "Criar Prova"}</Button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
