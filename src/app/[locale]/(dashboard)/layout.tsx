"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("dashboard");
    const pathname = usePathname();
    const [isSpacesOpen, setIsSpacesOpen] = useState(true);

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-indigo-500/30">

            {/* 
        ========================================
        PRIMARY SIDEBAR (Thin, Workspace Level)
        ========================================
      */}
            <aside className="hidden w-16 flex-col items-center border-r border-zinc-900 bg-zinc-950 py-4 lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/20">
                    <Image
                        src="https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_38,h_30,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png"
                        alt="GP"
                        width={20}
                        height={16}
                        className="drop-shadow-sm brightness-200"
                    />
                </div>

                <nav className="mt-8 flex flex-col items-center gap-4 w-full px-2">
                    {/* Top Icons */}
                    <button className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>

                    <button className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </button>
                </nav>

                <div className="mt-auto flex flex-col items-center gap-4 w-full px-2">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-zinc-300 ring-2 ring-transparent transition-all hover:ring-zinc-700">
                        G
                    </button>
                </div>
            </aside>

            {/* 
        ========================================
        SECONDARY SIDEBAR (Hierarchical)
        ========================================
      */}
            <aside className="hidden w-64 flex-col border-r border-zinc-800/60 bg-[#0F0F13] lg:flex z-10">
                <div className="flex h-[52px] items-center px-4 border-b border-zinc-800/60">
                    <span className="text-[13px] font-semibold tracking-wide text-zinc-100">Gorilla Studio</span>
                    <svg className="ml-auto h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

                    {/* Global Views */}
                    <div className="space-y-0.5">
                        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 transition-colors bg-zinc-800/40">
                            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {t("sidebar.home")}
                        </Link>
                        <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t("sidebar.goals")}
                        </button>
                        <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            {t("sidebar.favorites")}
                        </button>
                    </div>

                    {/* Spaces Hierarchy */}
                    <Collapsible open={isSpacesOpen} onOpenChange={setIsSpacesOpen} className="space-y-1">
                        <div className="flex items-center justify-between px-2 mb-1 group">
                            <span className="text-[11px] font-bold tracking-wider text-zinc-500">{t("sidebar.spaces")}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="h-5 w-5 rounded hover:bg-zinc-700 flex items-center justify-center text-zinc-400">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-zinc-300 hover:bg-zinc-800/50">
                                <svg className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${isSpacesOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="h-4 w-4 rounded bg-fuchsia-500/20 text-fuchsia-500 flex items-center justify-center font-bold text-[10px]">M</div>
                                {t("sidebar.marketing")}
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pl-6 pr-2 py-1 space-y-0.5">
                            <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600"></span> Campanha Q3
                            </button>
                            <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600"></span> Social Media Setembro
                            </button>
                        </CollapsibleContent>

                        <div className="w-full flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 mt-1 cursor-pointer">
                            <svg className="h-3.5 w-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="h-4 w-4 rounded bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px]">D</div>
                            {t("sidebar.design")}
                        </div>

                        <div className="px-2 pt-2">
                            <span className="text-[12px] text-zinc-500 hover:text-zinc-300 cursor-pointer">{t("sidebar.allSpaces")}</span>
                        </div>
                    </Collapsible>
                </div>
            </aside>

            {/* 
        ========================================
        MAIN CONTENT AREA
        ========================================
      */}
            <div className="flex flex-1 flex-col overflow-hidden bg-[#18181B] relative">

                {/* Top Header (Breadcrumbs + Actions) */}
                <header className="flex h-[52px] items-center justify-between border-b border-zinc-800/60 bg-[#18181B] px-4 shrink-0">

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 flex-1">
                        <Breadcrumb>
                            <BreadcrumbList className="text-[13px] sm:gap-1.5">
                                <BreadcrumbItem>
                                    <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    </div>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="[&>svg]:w-3.5 [&>svg]:h-3.5" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/dashboard" className="text-zinc-400 hover:text-zinc-200">Gorilla Studio</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="[&>svg]:w-3.5 [&>svg]:h-3.5" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                        {t("sidebar.home")}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* Quick Actions & Search */}
                    <div className="flex items-center gap-3">

                        {/* Command Palette Mock */}
                        <div className="hidden sm:flex items-center w-64 h-7 rounded border border-zinc-800 bg-zinc-900/50 px-2 text-[12px] text-zinc-500 font-medium cursor-text hover:border-zinc-700 transition-colors">
                            <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            {t("header.search")}
                        </div>

                        <Button size="sm" variant="ghost" className="h-7 border border-zinc-700 border-dashed text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 text-[12px] px-2.5">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            {t("header.invite")}
                        </Button>

                        <Button size="sm" className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-[12px] px-2.5 shadow-sm">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            {t("header.newProject")}
                        </Button>

                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-hidden relative">
                    {/* Subtle gradient backdrop for depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent pointer-events-none" />
                    <div className="h-full w-full overflow-y-auto px-6 py-6 lg:px-8 relative z-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
