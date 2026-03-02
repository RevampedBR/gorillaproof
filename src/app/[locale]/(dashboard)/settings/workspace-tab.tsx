"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { updateOrgSettings } from "@/lib/actions/organization";

interface WorkspaceTabProps {
    orgId: string;
    initialName: string;
    initialLanguage?: string;
    initialTimezone?: string;
}

export function WorkspaceTab({ orgId, initialName, initialLanguage, initialTimezone }: WorkspaceTabProps) {
    const { toast } = useToast();
    const [name, setName] = useState(initialName || "");
    const [language, setLanguage] = useState(initialLanguage || "pt-BR");
    const [timezone, setTimezone] = useState(initialTimezone || "America/Sao_Paulo");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const res = await updateOrgSettings(orgId, { name, language, timezone });
        setSaving(false);
        if (res.error) {
            toast(res.error, "error");
        } else {
            toast("Configurações do workspace salvas!", "success");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-5">
                <div>
                    <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Nome da organização</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40 transition-colors"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Idioma Padrão</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-zinc-200 outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                        >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (US)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Fuso Horário</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-zinc-200 outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                        >
                            <option value="America/Sao_Paulo">Brasília (BRT)</option>
                            <option value="Europe/Lisbon">Lisboa (WET)</option>
                            <option value="America/New_York">New York (EST)</option>
                        </select>
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                    >
                        {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
