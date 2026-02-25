"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Link } from "@/i18n/navigation";

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
    active: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    archived: "bg-muted text-muted-foreground border-muted-foreground/30",
    completed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
};

export function DashboardHomeClient({ projects, stats }: DashboardHomeClientProps) {
    const t = useTranslations("dashboard.home");
    const tp = useTranslations("dashboard.projects");

    const activeProjects = projects.filter((p) => p.status === "active");

    const statCards = [
        { label: t("activeProjects"), value: stats.activeProjects, color: "text-emerald-500", dot: "bg-emerald-500" },
        { label: t("urgentProofs"), value: stats.totalProofs, color: "text-amber-500", dot: "bg-amber-500" },
        { label: t("pendingComments"), value: stats.pendingComments, color: "text-sky-500", dot: "bg-sky-500" },
        { label: t("approvedToday"), value: stats.approvedToday, color: "text-indigo-500", dot: "bg-indigo-500" },
    ];

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {t("welcome")}
                    </h1>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>
                <CreateProjectDialog>
                    <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-secondary/50 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {tp("createTitle")}
                    </button>
                </CreateProjectDialog>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {statCards.map((stat, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className={`text-2xl font-bold tracking-tight font-mono ${stat.color}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Projects List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Projects
                    </h2>
                    <Link
                        href="/projects"
                        className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        View all
                    </Link>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {activeProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                            <div className="h-11 w-11 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
                                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                            </div>
                            <h3 className="text-[14px] font-medium text-foreground">{t("noProjects")}</h3>
                            <p className="text-[12px] text-muted-foreground mt-1 mb-4 max-w-xs">{t("subtitle")}</p>
                            <CreateProjectDialog>
                                <button className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors">
                                    + {tp("createTitle")}
                                </button>
                            </CreateProjectDialog>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {activeProjects.map((project: any) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                    {project.name}
                                                </p>
                                                {project.clients && (
                                                    <span className="text-[10px] text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">
                                                        {project.clients.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {project.proofs?.length || 0} {t("proofs")} · {t("lastUpdated")}{" "}
                                                {new Date(project.updated_at).toLocaleDateString("en-US", {
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
                                        <svg className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
