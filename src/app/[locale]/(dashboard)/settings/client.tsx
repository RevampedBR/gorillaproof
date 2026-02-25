"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getOrgSettings, updateOrgSettings, getOrgUsageStats } from "@/lib/actions/organization";
import { getNotificationPrefs, updateNotificationPrefs } from "@/lib/actions/notifications";
import { getClients, createClient, updateClient, deleteClient } from "@/lib/actions/clients";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsClientProps {
    orgId: string;
}

export function SettingsClient({ orgId }: SettingsClientProps) {
    const t = useTranslations("dashboard.settings");
    const { toast } = useToast();
    const [tab, setTab] = useState<"org" | "clients" | "notifications" | "usage" | "language">("org");
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const [isPending, startTransition] = useTransition();

    // Org settings
    const [orgName, setOrgName] = useState("");
    const [brandColor, setBrandColor] = useState("#34d399");
    const [savingOrg, setSavingOrg] = useState(false);

    // Clients
    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [editingClient, setEditingClient] = useState<{ id: string; name: string } | null>(null);

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
        fetchClients();
    }, [orgId]);

    const fetchClients = async () => {
        setLoadingClients(true);
        const { data } = await getClients();
        setClients(data || []);
        setLoadingClients(false);
    };

    const handleSaveOrg = async () => {
        setSavingOrg(true);
        const result = await updateOrgSettings(orgId, { name: orgName, brand_color: brandColor });
        setSavingOrg(false);
        if (result.error) toast(result.error, "error");
        else toast("Configurações salvas!", "success");
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append("name", newClientName);
            const result = await createClient(formData);
            if (result.error) {
                toast(result.error, "error");
            } else {
                setNewClientName("");
                fetchClients();
                toast("Cliente criado com sucesso!", "success");
            }
        });
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient || !editingClient.name.trim()) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append("name", editingClient.name);
            const result = await updateClient(editingClient.id, formData);
            if (result.error) {
                toast(result.error, "error");
            } else {
                setEditingClient(null);
                fetchClients();
                toast("Cliente atualizado!", "success");
            }
        });
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm(t("clients.confirmDelete"))) return;

        const result = await deleteClient(id);
        if (result.error) toast(result.error, "error");
        else {
            fetchClients();
            toast("Cliente removido.", "success");
        }
    };

    const handleTogglePref = async (key: keyof typeof prefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        await updateNotificationPrefs({ [key]: updated[key] });
    };

    const handleLanguageChange = (newLocale: string) => {
        startTransition(() => {
            router.replace(pathname, { locale: newLocale });
            toast(t("language.saved"), "success");
        });
    };

    const TABS = [
        { key: "org" as const, label: t("tabs.organization") },
        { key: "clients" as const, label: t("tabs.clients") },
        { key: "notifications" as const, label: t("tabs.notifications") },
        { key: "language" as const, label: t("tabs.language") },
        { key: "usage" as const, label: t("usage.tab") },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("title")}
                </h1>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0">
                    <nav className="flex flex-col gap-1">
                        {TABS.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setTab(item.key)}
                                className={`flex items-center justify-start px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                                    tab === item.key
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    {/* Organization Settings */}
                    {tab === "org" && (
                        <div className="space-y-6">
                            <div className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName">{t("org.name")}</Label>
                                    <Input
                                        id="orgName"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        className="max-w-md"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("org.brandColor")}</Label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative overflow-hidden w-10 h-10 rounded-lg border shadow-sm">
                                            <input
                                                type="color"
                                                value={brandColor}
                                                onChange={(e) => setBrandColor(e.target.value)}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-sm font-mono text-muted-foreground border px-2 py-1 rounded bg-muted/50">
                                            {brandColor}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <Button onClick={handleSaveOrg} disabled={savingOrg}>
                                        {savingOrg ? t("org.saving") : t("org.save")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clients Management */}
                    {tab === "clients" && (
                        <div className="space-y-6">
                            <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                                <div>
                                    <h3 className="text-lg font-medium">{t("clients.title")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("clients.subtitle")}</p>
                                </div>

                                <form onSubmit={handleCreateClient} className="flex gap-2">
                                    <Input
                                        placeholder={t("clients.name")}
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        className="max-w-md"
                                    />
                                    <Button type="submit" disabled={isPending}>
                                        {t("clients.addClient")}
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {loadingClients ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                                    ) : clients.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                                            {t("clients.noClients")}
                                        </div>
                                    ) : (
                                        <div className="divide-y border rounded-lg">
                                            {clients.map((client) => (
                                                <div key={client.id} className="flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors">
                                                    {editingClient?.id === client.id ? (
                                                        <form onSubmit={handleUpdateClient} className="flex flex-1 items-center gap-2">
                                                            <Input
                                                                value={editingClient.name}
                                                                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                                                                className="h-8 text-sm"
                                                                autoFocus
                                                            />
                                                            <Button size="sm" type="submit" variant="default" disabled={isPending}>Save</Button>
                                                            <Button size="sm" type="button" variant="ghost" onClick={() => setEditingClient(null)}>Cancel</Button>
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <span className="font-medium text-sm">{client.name}</span>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setEditingClient({ id: client.id, name: client.name })}
                                                                >
                                                                    {t("clients.edit")}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleDeleteClient(client.id)}
                                                                >
                                                                    {t("clients.delete")}
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    {tab === "notifications" && (
                        <div className="bg-card border rounded-xl divide-y shadow-sm">
                            {[
                                { key: "email_on_comment" as const, label: t("notifications.emailOnComment"), desc: t("notifications.emailOnCommentDesc") },
                                { key: "email_on_decision" as const, label: t("notifications.emailOnDecision"), desc: t("notifications.emailOnDecisionDesc") },
                                { key: "email_on_mention" as const, label: t("notifications.emailOnMention"), desc: t("notifications.emailOnMentionDesc") },
                                { key: "email_on_deadline" as const, label: t("notifications.emailOnDeadline"), desc: t("notifications.emailOnDeadlineDesc") },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => handleTogglePref(item.key)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                            prefs[item.key] ? "bg-primary" : "bg-input"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                prefs[item.key] ? "translate-x-5" : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Language Settings */}
                    {tab === "language" && (
                        <div className="space-y-6">
                            <div className="bg-card border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-medium mb-4">{t("language.select")}</h3>
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleLanguageChange("pt")}
                                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                                            currentLocale === "pt" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🇧🇷</span>
                                            <span className="font-medium">{t("language.pt")}</span>
                                        </div>
                                        {currentLocale === "pt" && (
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>

                                    <div
                                        onClick={() => handleLanguageChange("en")}
                                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                                            currentLocale === "en" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🇺🇸</span>
                                            <span className="font-medium">{t("language.en")}</span>
                                        </div>
                                        {currentLocale === "en" && (
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Usage Stats */}
                    {tab === "usage" && (
                        <div className="grid grid-cols-2 gap-4">
                            {usage ? (
                                [
                                    { label: t("usage.projects"), value: usage.projects, icon: "P", color: "from-blue-500/20 to-indigo-500/20 text-indigo-500" },
                                    { label: t("usage.proofs"), value: usage.proofs, icon: "📄", color: "from-emerald-500/20 to-teal-500/20 text-emerald-500" },
                                    { label: t("usage.versions"), value: usage.versions, icon: "🔄", color: "from-violet-500/20 to-purple-500/20 text-purple-500" },
                                    { label: t("usage.members"), value: usage.members, icon: "👥", color: "from-amber-500/20 to-orange-500/20 text-orange-500" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm">
                                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl font-bold`}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{stat.value}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
