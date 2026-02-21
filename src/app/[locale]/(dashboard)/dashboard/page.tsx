"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardHomePage() {
    const t = useTranslations("dashboard.home");

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                        {t("welcome")} 🍌
                    </h1>
                    <p className="text-[13px] text-zinc-400 mt-1">{"Sexta-feira, 20 de Fevereiro"}</p>
                </div>
            </div>

            {/* Structured Tab View */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="h-10 bg-zinc-900/50 border border-zinc-800/80 inline-flex w-fit items-center justify-start rounded-lg p-1 space-x-1 shadow-sm mb-6">
                    <TabsTrigger
                        value="overview"
                        className="rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
                    >
                        {t("overview")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="assigned"
                        className="rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
                    >
                        {t("assigned")}
                        <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:border-indigo-400">
                            0
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="recent"
                        className="rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
                    >
                        {t("recent")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 pt-6 outline-none">

                    {/* Quick Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-4 mb-8">
                        {[
                            { label: t("activeProjects"), value: "0", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                            { label: t("urgentProofs"), value: "0", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
                            { label: t("pendingComments"), value: "0", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
                            { label: "Aprovadas Hoje", value: "0", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-all hover:bg-zinc-900/80 hover:border-zinc-700 cursor-pointer"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`h-2 w-2 rounded-full ${stat.color} shadow-[0_0_8px_currentColor]`} />
                                    <span className="text-[12px] font-medium text-zinc-400 group-hover:text-zinc-300">{stat.label}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-[14px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                {t("myWork")}
                            </h2>

                            {/* Dense List View Mock */}
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-sm">
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                                        <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-[14px] font-medium text-zinc-200">{t("noWork")}</h3>
                                    <p className="text-[13px] text-zinc-500 mt-1 mb-5 max-w-xs">{t("subtitle")}</p>
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] h-8 px-4 rounded-md">
                                        + {t("createFirst")}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right sidebar widget */}
                        <div className="space-y-4">
                            <h2 className="text-[14px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t("recent")}
                            </h2>
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                                <p className="text-[12px] text-zinc-500 italic">Nenhum projeto visualizado recentemente.</p>
                            </div>
                        </div>
                    </div>

                </TabsContent>
            </Tabs>
        </div>
    );
}
