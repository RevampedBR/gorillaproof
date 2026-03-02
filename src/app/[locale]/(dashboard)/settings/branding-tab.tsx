"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { updateOrgSettings } from "@/lib/actions/organization";
import { ColorPicker } from "@/components/ui/color-picker";
import { LogoCropper } from "@/components/ui/logo-cropper";

import { createClient } from "@/utils/supabase/client";

interface BrandingTabProps {
    orgId: string;
    initialColor: string;
    initialLogoUrl?: string | null;
}

export function BrandingTab({ orgId, initialColor, initialLogoUrl }: BrandingTabProps) {
    const { toast } = useToast();
    const [brandColor, setBrandColor] = useState(initialColor || "#34d399");
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
    const [saving, setSaving] = useState(false);

    const handleLogoUpload = async (file: File) => {
        try {
            const supabase = createClient();
            const path = `${orgId}/logos/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from("brand-assets").upload(path, file, {
                cacheControl: "3600",
                upsert: true,
            });
            if (error) { toast("Erro ao enviar logo: " + error.message, "error"); return; }
            const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(path);
            const newUrl = urlData.publicUrl;
            setLogoUrl(newUrl);
            await updateOrgSettings(orgId, { logo_url: newUrl });
            toast("Logo atualizada!", "success");
        } catch {
            toast("Erro ao enviar logo", "error");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateOrgSettings(orgId, { brand_color: brandColor });
        setSaving(false);
        if (res.error) {
            toast(res.error, "error");
        } else {
            toast("Configurações de marca salvas!", "success");
        }
    };

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Logo da Agência</h3>
                        <p className="text-[12px] text-zinc-500">Aparecerá nos links de prova e emails enviados aos clientes.</p>
                    </div>
                </div>
                <LogoCropper onUpload={handleLogoUpload} currentLogoUrl={logoUrl} />
            </div>

            {/* Brand Color Section */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Cor da Marca</h3>
                        <p className="text-[12px] text-zinc-500">Aplicada nos botões e destaques dos links de prova.</p>
                    </div>
                </div>

                <div className="flex items-start gap-6">
                    <ColorPicker value={brandColor} onChange={setBrandColor} />
                    {/* Live preview */}
                    <div className="flex-1 rounded-xl border border-zinc-800/40 bg-zinc-950/50 p-5 space-y-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Preview do link de prova</p>
                        <div className="flex items-center gap-3 mb-3">
                            {logoUrl ? (
                                <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain bg-zinc-800 p-1" />
                            ) : (
                                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                    <span className="text-[11px] font-bold text-zinc-500">GP</span>
                                </div>
                            )}
                            <span className="text-[13px] font-semibold text-zinc-300">Sua Agência</span>
                        </div>
                        <button
                            className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-colors"
                            style={{ backgroundColor: brandColor }}
                        >
                            ✓ Aprovar Prova
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: brandColor, opacity: 0.3 }} />
                        </div>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800/40">
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
