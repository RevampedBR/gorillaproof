"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { updateOrgSettings } from "@/lib/actions/organization";

interface ProofingTabProps {
    orgId: string;
    initialStatus?: string;
    initialTheme?: string;
    initialAutoLock?: boolean;
    initialDownload?: boolean;
    initialReviewerAccess?: string;
}

export function ProofingTab({ orgId, initialStatus, initialTheme, initialAutoLock, initialDownload, initialReviewerAccess }: ProofingTabProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [defaultStatus, setDefaultStatus] = useState(initialStatus || "draft");
    const [viewerTheme, setViewerTheme] = useState(initialTheme || "dark");
    const [autoLock, setAutoLock] = useState(initialAutoLock ?? true);
    const [allowDownload, setAllowDownload] = useState(initialDownload ?? true);
    const [reviewerAccess, setReviewerAccess] = useState(initialReviewerAccess || "email_verify");

    const handleSave = async () => {
        setSaving(true);
        const res = await updateOrgSettings(orgId, {
            default_proof_status: defaultStatus,
            viewer_theme: viewerTheme,
            auto_lock_on_decision: autoLock,
            allow_download: allowDownload,
            reviewer_auth_mode: reviewerAccess,
        });
        setSaving(false);
        if (res.error) {
            toast(res.error, "error");
        } else {
            toast("Configurações de provas salvas!", "success");
        }
    };

    return (
        <div className="space-y-6">
            {/* Default Behavior */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Comportamento Padrão</h3>
                        <p className="text-[12px] text-zinc-500">Regras aplicadas automaticamente a novas provas criadas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Status Inicial</label>
                        <select
                            value={defaultStatus}
                            onChange={(e) => setDefaultStatus(e.target.value)}
                            className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3 text-[13px] text-zinc-200 outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                        >
                            <option value="draft">Rascunho (Privado para equipe)</option>
                            <option value="in_review">Em Revisão (Aberto para clientes)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Tema do Proof Viewer</label>
                        <select
                            value={viewerTheme}
                            onChange={(e) => setViewerTheme(e.target.value)}
                            className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3 text-[13px] text-zinc-200 outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                        >
                            <option value="dark">Dark Mode (Recomendado)</option>
                            <option value="light">Light Mode</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1 mt-6 pt-5 border-t border-zinc-800/40">
                    <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors -mx-3">
                        <div>
                            <p className="text-[14px] font-medium text-white">Auto-Lock em decisões</p>
                            <p className="text-[12px] text-zinc-500 mt-0.5">Trancar a prova após decisão final (Aprovada/Rejeitada)</p>
                        </div>
                        <button
                            onClick={() => setAutoLock(!autoLock)}
                            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${autoLock ? "bg-emerald-500" : "bg-zinc-700"}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${autoLock ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors -mx-3">
                        <div>
                            <p className="text-[14px] font-medium text-white">Download do arquivo original</p>
                            <p className="text-[12px] text-zinc-500 mt-0.5">Permitir que reviewers baixem o arquivo fonte</p>
                        </div>
                        <button
                            onClick={() => setAllowDownload(!allowDownload)}
                            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${allowDownload ? "bg-emerald-500" : "bg-zinc-700"}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${allowDownload ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reviewer Access */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Acesso do Reviewer</h3>
                        <p className="text-[12px] text-zinc-500">Como clientes acessam os links de aprovação.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => setReviewerAccess("open")}
                        className={`text-left p-4 rounded-xl border transition-all ${reviewerAccess === "open" ? "border-emerald-500/50 bg-emerald-500/10" : "border-zinc-700/40 bg-zinc-800/30 hover:border-zinc-600"}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${reviewerAccess === "open" ? "border-emerald-500" : "border-zinc-600"}`}>
                                {reviewerAccess === "open" && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="text-[14px] font-medium text-white">Link Público</span>
                        </div>
                        <p className="text-[12px] text-zinc-500 pl-7 leading-relaxed">Qualquer pessoa com o link pode ver e comentar. Sem verificação.</p>
                    </button>

                    <button
                        onClick={() => setReviewerAccess("email_verify")}
                        className={`text-left p-4 rounded-xl border transition-all ${reviewerAccess === "email_verify" ? "border-emerald-500/50 bg-emerald-500/10" : "border-zinc-700/40 bg-zinc-800/30 hover:border-zinc-600"}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${reviewerAccess === "email_verify" ? "border-emerald-500" : "border-zinc-600"}`}>
                                {reviewerAccess === "email_verify" && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="text-[14px] font-medium text-white flex items-center gap-2">
                                Verificação por Email
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Recomendado</span>
                            </span>
                        </div>
                        <p className="text-[12px] text-zinc-500 pl-7 leading-relaxed">Reviewer digita email e recebe código PIN para validar identidade.</p>
                    </button>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                    {saving ? "Salvando..." : "Salvar Configurações de Provas"}
                </Button>
            </div>
        </div>
    );
}
