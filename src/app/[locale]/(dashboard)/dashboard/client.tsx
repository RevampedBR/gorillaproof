"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Link } from "@/i18n/navigation";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

interface DashboardHomeClientProps {
    projects: any[];
    stats: {
        activeProjects: number;
        totalProofs: number;
        pendingComments: number;
        approvedToday: number;
    };
}

const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    archived: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function DashboardHomeClient({ projects, stats }: DashboardHomeClientProps) {
    const t = useTranslations("dashboard.home");
    const tp = useTranslations("dashboard.projects");

    const activeProjects = projects.filter((p) => p.status === "active");

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                        {t("welcome")} 🍌
                    </h1>
                    <p className="text-[13px] text-zinc-400 mt-1">
                        {new Date().toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>
                <CreateProjectDialog>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] h-8 px-4 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    >
                        + {tp("createTitle")}
                    </Button>
                </CreateProjectDialog>
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
                        <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {stats.totalProofs}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="recent"
                        className="rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
                    >
                        {t("recent")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="analytics"
                        className="rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
                    >
                        📊 Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 pt-6 outline-none">

                    {/* Quick Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-4 mb-8">
                        {[
                            { label: t("activeProjects"), value: String(stats.activeProjects), color: "text-emerald-400", dot: "bg-emerald-400" },
                            { label: t("urgentProofs"), value: String(stats.totalProofs), color: "text-amber-400", dot: "bg-amber-400" },
                            { label: t("pendingComments"), value: String(stats.pendingComments), color: "text-sky-400", dot: "bg-sky-400" },
                            { label: t("approvedToday"), value: String(stats.approvedToday), color: "text-rose-400", dot: "bg-rose-400" },
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-all hover:bg-zinc-900/80 hover:border-zinc-700 cursor-pointer"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`h-2 w-2 rounded-full ${stat.dot} shadow-[0_0_8px_currentColor]`} />
                                    <span className="text-[12px] font-medium text-zinc-400 group-hover:text-zinc-300">{stat.label}</span>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-[14px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                {t("myWork")}
                            </h2>

                            {/* Project List */}
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-sm">
                                {activeProjects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-[14px] font-medium text-zinc-200">{t("noProjects")}</h3>
                                        <p className="text-[13px] text-zinc-500 mt-1 mb-5 max-w-xs">{t("subtitle")}</p>
                                        <CreateProjectDialog>
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] h-8 px-4 rounded-md">
                                                + {tp("createTitle")}
                                            </Button>
                                        </CreateProjectDialog>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-800/50">
                                        {activeProjects.map((project: any) => (
                                            <Link
                                                key={project.id}
                                                href={`/projects/${project.id}`}
                                                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate">
                                                            {project.name}
                                                        </p>
                                                        <p className="text-[11px] text-zinc-500 mt-0.5">
                                                            {project.proofs?.length || 0} {t("proofs")} · {t("lastUpdated")}{" "}
                                                            {new Date(project.updated_at).toLocaleDateString("pt-BR", {
                                                                day: "2-digit",
                                                                month: "short",
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}
                                                    >
                                                        {tp(`status${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`)}
                                                    </Badge>
                                                    <svg className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                    </svg>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right sidebar widget */}
                        <div className="space-y-4">
                            <h2 className="text-[14px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t("recent")}
                            </h2>
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                                <p className="text-[12px] text-zinc-500 italic">{t("recentlyViewed")}</p>
                            </div>
                        </div>
                    </div>

                </TabsContent>

                <TabsContent value="analytics" className="flex-1 pt-6 outline-none">
                    <AnalyticsDashboard />
                </TabsContent>
            </Tabs>
        </div>
    );
}
