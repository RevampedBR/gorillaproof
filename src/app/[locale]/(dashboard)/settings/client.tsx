"use client";

import { useState, useEffect } from "react";
import { getOrgSettings, updateOrgSettings, getOrgUsageStats } from "@/lib/actions/organization";
import { getNotificationPrefs, updateNotificationPrefs } from "@/lib/actions/notifications";
import { useToast } from "@/components/ui/toast-provider";
import { Building2, BellRing, Activity, FolderKanban, FileText, RefreshCw, Users, Save, Globe, Palette, Check } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

interface SettingsClientProps {
    orgId: string;
}

export function SettingsClient({ orgId }: SettingsClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const t = useTranslations("dashboard.settings"); // Fallback se quiser usar tradução, mas vamos usar textos hardcoded como o restante do arquivo (se n houver keys no i18n correspondentes).

    const [tab, setTab] = useState<"org" | "preferences" | "notifications" | "usage">("org");

    // Org settings
    const [orgName, setOrgName] = useState("");
    const [brandColor, setBrandColor] = useState("#34d399");
    const [saving, setSaving] = useState(false);

    // Notification prefs
    const [prefs, setPrefs] = useState({
        email_on_comment: true,
        email_on_decision: true,
        email_on_mention: true,
        email_on_deadline: true,
    });

    // Usage stats
    const [usage, setUsage] = useState<{ projects: number; proofs: number; versions: number; members: number } | null>(null);

    useEffect(() => {
        getOrgSettings(orgId).then(({ data }) => {
            if (data) {
                setOrgName(data.name || "");
                setBrandColor(data.brand_color || "#34d399");
            }
        });
        getNotificationPrefs().then(({ data }) => {
            if (data) setPrefs(data);
        });
        getOrgUsageStats(orgId).then(({ data }) => {
            if (data) setUsage(data);
        });
    }, [orgId]);

    const handleSaveOrg = async () => {
        setSaving(true);
        const result = await updateOrgSettings(orgId, { name: orgName, brand_color: brandColor });
        setSaving(false);
        if (result.error) toast(result.error, "error");
        else toast("Configurações salvas!", "success");
    };

    const handleTogglePref = async (key: keyof typeof prefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        await updateNotificationPrefs({ [key]: updated[key] });
    };

    const TABS = [
        { key: "org" as const, label: "Organização", icon: Building2 },
        { key: "preferences" as const, label: "Preferências", icon: Globe },
        { key: "notifications" as const, label: "Notificações", icon: BellRing },
        { key: "usage" as const, label: "Uso", icon: Activity },
    ];

    const PREDEFINED_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${tab === t.key ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"}`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Org Tab */}
            {tab === "org" && (
                <div className="space-y-6">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-5">
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Nome da organização</label>
                            <input
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-4 flex items-center gap-2">
                                <Palette className="h-4 w-4 text-emerald-400" /> Cor da marca
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                                {PREDEFINED_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setBrandColor(color)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${brandColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : "hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-900"}`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {brandColor === color && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                                    </button>
                                ))}
                                <div className="w-px h-8 bg-zinc-800 mx-1" />
                                <div className="relative group">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700 overflow-hidden transition-transform group-hover:scale-110 ${!PREDEFINED_COLORS.includes(brandColor) ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""}`} style={{ backgroundColor: brandColor }}>
                                        <input
                                            type="color"
                                            value={brandColor}
                                            onChange={(e) => setBrandColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col ml-3 px-3 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40 focus-within:border-emerald-500/40 transition-colors">
                                    <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Custom Hex</span>
                                    <input
                                        type="text"
                                        value={brandColor}
                                        onChange={(e) => setBrandColor(e.target.value)}
                                        className="bg-transparent border-none text-[13px] text-zinc-300 font-mono focus:outline-none focus:ring-0 p-0 w-20 uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 mt-2 border-t border-zinc-800/40">
                            <button
                                onClick={handleSaveOrg}
                                disabled={saving}
                                className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preferences Tab */}
            {tab === "preferences" && (
                <div className="space-y-6">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Globe className="h-4 w-4 text-emerald-400" />
                                <label className="text-[14px] font-semibold text-white tracking-wide">Idioma do Sistema</label>
                            </div>
                            <p className="text-[13px] text-zinc-400 mb-6">Em qual idioma você gostaria de utilizar a interface do GorillaProof?</p>

                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <button
                                    onClick={() => router.replace(pathname, { locale: "pt" })}
                                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${currentLocale === "pt" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800"}`}
                                >
                                    {currentLocale === "pt" && (
                                        <div className="absolute top-3 right-3 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    <span className="text-3xl mb-2">🇧🇷</span>
                                    <span className="font-semibold text-[14px]">Português</span>
                                    <span className="text-[11px] opacity-70 mt-1">Brasil</span>
                                </button>

                                <button
                                    onClick={() => router.replace(pathname, { locale: "en" })}
                                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${currentLocale === "en" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800"}`}
                                >
                                    {currentLocale === "en" && (
                                        <div className="absolute top-3 right-3 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    <span className="text-3xl mb-2">🇺🇸</span>
                                    <span className="font-semibold text-[14px]">English</span>
                                    <span className="text-[11px] opacity-70 mt-1">United States</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Tab */}
            {tab === "notifications" && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-4">
                    {[
                        { key: "email_on_comment" as const, label: "Novos comentários", desc: "Receber email quando alguém comentar em seus proofs" },
                        { key: "email_on_decision" as const, label: "Decisões de review", desc: "Notificar quando um reviewer aprovar ou rejeitar" },
                        { key: "email_on_mention" as const, label: "Menções (@)", desc: "Receber email quando for mencionado em um comentário" },
                        { key: "email_on_deadline" as const, label: "Deadlines próximos", desc: "Lembrete quando um proof estiver perto do prazo" },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-zinc-800/30 last:border-0">
                            <div>
                                <p className="text-[14px] font-medium text-white">{item.label}</p>
                                <p className="text-[12px] text-zinc-500 mt-0.5">{item.desc}</p>
                            </div>
                            <button
                                onClick={() => handleTogglePref(item.key)}
                                className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${prefs[item.key] ? "bg-emerald-500" : "bg-zinc-700"}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${prefs[item.key] ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Usage Tab */}
            {tab === "usage" && (
                <div className="grid grid-cols-2 gap-4">
                    {usage ? (
                        [
                            { label: "Projetos", value: usage.projects, Icon: FolderKanban, color: "from-blue-500 to-indigo-500", iconColor: "text-blue-200" },
                            { label: "Proofs", value: usage.proofs, Icon: FileText, color: "from-emerald-500 to-teal-500", iconColor: "text-emerald-200" },
                            { label: "Versões", value: usage.versions, Icon: RefreshCw, color: "from-violet-500 to-purple-500", iconColor: "text-violet-200" },
                            { label: "Membros", value: usage.members, Icon: Users, color: "from-amber-500 to-orange-500", iconColor: "text-amber-200" },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg border border-white/10`}>
                                    <stat.Icon className={`h-6 w-6 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-[12px] text-zinc-500 mt-0.5">{stat.label}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-xl bg-zinc-800/30 animate-pulse" />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
