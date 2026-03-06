"use client";

import { useState, useEffect } from "react";
import { getOrgSettings } from "@/lib/actions/organization";
import { getNotificationPrefs, type NotificationPrefs } from "@/lib/actions/notifications";
import { WorkspaceTab } from "./workspace-tab";
import { TeamTab } from "./team-tab";
import { ProofingTab } from "./proofing-tab";
import { BrandingTab } from "./branding-tab";
import { ProfileTab } from "./profile-tab";

interface SettingsClientProps {
    orgId: string;
    userEmail: string;
    userName: string;
}

export function SettingsClient({ orgId, userEmail, userName }: SettingsClientProps) {
    const [tab, setTab] = useState<"workspace" | "team" | "proofing" | "branding" | "profile">("workspace");
    const [orgData, setOrgData] = useState<Record<string, any> | null>(null);
    const [prefsData, setPrefsData] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getOrgSettings(orgId),
            getNotificationPrefs()
        ]).then(([orgRes, prefsRes]) => {
            if (orgRes.data) setOrgData(orgRes.data);
            if (prefsRes.data) setPrefsData(prefsRes.data);
            setLoading(false);
        });
    }, [orgId]);

    const TABS = [
        {
            key: "workspace" as const,
            label: "Organização",
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
            ),
        },
        {
            key: "team" as const,
            label: "Equipe",
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
        },
        {
            key: "branding" as const,
            label: "Marca & Visual",
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
            ),
        },
        {
            key: "proofing" as const,
            label: "Provas",
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            key: "profile" as const,
            label: "Meu Perfil",
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-20 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-[13px] text-zinc-500">Carregando configurações...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight font-heading">Configurações</h1>
                <p className="text-[13px] text-zinc-500 mt-1">Gerencie sua organização, equipe e preferências pessoais.</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 mb-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1 overflow-x-auto no-scrollbar">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${tab === t.key
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {tab === "workspace" && (
                    <WorkspaceTab
                        orgId={orgId}
                        initialName={(orgData?.name as string) || ""}
                        initialLanguage={orgData?.language as string}
                        initialTimezone={orgData?.timezone as string}
                    />
                )}
                {tab === "team" && <TeamTab orgId={orgId} />}
                {tab === "proofing" && (
                    <ProofingTab
                        orgId={orgId}
                        initialStatus={orgData?.default_proof_status as string}
                        initialTheme={orgData?.viewer_theme as string}
                        initialAutoLock={orgData?.auto_lock_on_decision as boolean | undefined}
                        initialDownload={orgData?.allow_download as boolean | undefined}
                        initialReviewerAccess={orgData?.reviewer_auth_mode as string}
                    />
                )}
                {tab === "branding" && (
                    <BrandingTab
                        orgId={orgId}
                        initialColor={(orgData?.brand_color as string) || "#34d399"}
                        initialLogoUrl={orgData?.logo_url as string | null}
                    />
                )}
                {tab === "profile" && (
                    <ProfileTab
                        userEmail={userEmail}
                        userName={userName}
                        initialPrefs={(prefsData as any) || {
                            email_on_comment: true,
                            email_on_decision: true,
                            email_on_mention: true,
                            email_on_deadline: true,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
