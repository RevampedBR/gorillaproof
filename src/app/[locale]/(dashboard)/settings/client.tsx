"use client";

import { useState, useEffect } from "react";
import { getOrgSettings, updateOrgSettings, getOrgUsageStats } from "@/lib/actions/organization";
import { getNotificationPrefs, updateNotificationPrefs } from "@/lib/actions/notifications";
import { useToast } from "@/components/ui/toast-provider";

interface SettingsClientProps {
    orgId: string;
}

export function SettingsClient({ orgId }: SettingsClientProps) {
    const { toast } = useToast();
    const [tab, setTab] = useState<"org" | "notifications" | "usage">("org");

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
        { key: "org" as const, label: "🏢 Organização" },
        { key: "notifications" as const, label: "🔔 Notificações" },
        { key: "usage" as const, label: "📊 Uso" },
    ];

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${tab === t.key ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"}`}
                    >
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
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Cor da marca</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={brandColor}
                                    onChange={(e) => setBrandColor(e.target.value)}
                                    className="h-10 w-12 rounded-lg border border-zinc-700/40 cursor-pointer"
                                />
                                <span className="text-[13px] text-zinc-400 font-mono">{brandColor}</span>
                                <div className="h-8 w-8 rounded-full" style={{ backgroundColor: brandColor }} />
                            </div>
                        </div>
                        <button
                            onClick={handleSaveOrg}
                            disabled={saving}
                            className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {saving ? "Salvando..." : "💾 Salvar"}
                        </button>
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
                            { label: "Projetos", value: usage.projects, icon: "📁", color: "from-blue-500 to-indigo-500" },
                            { label: "Proofs", value: usage.proofs, icon: "📄", color: "from-emerald-500 to-teal-500" },
                            { label: "Versões", value: usage.versions, icon: "🔄", color: "from-violet-500 to-purple-500" },
                            { label: "Membros", value: usage.members, icon: "👥", color: "from-amber-500 to-orange-500" },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-lg`}>
                                    {stat.icon}
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
