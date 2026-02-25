"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { NewProofModal } from "@/components/dashboard/new-proof-modal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("dashboard");
    const pathname = usePathname();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNewProofOpen, setIsNewProofOpen] = useState(false);

    const isActive = (path: string) => {
        const cleanPath = pathname.replace(/^\/(pt|en)/, "");
        return cleanPath === path || cleanPath.startsWith(path + "/");
    };

    // Cmd+K listener for search
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const navItems = [
        {
            href: "/dashboard",
            label: t("sidebar.home"),
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            href: "/proofs",
            label: t("sidebar.allProofs") || "All Proofs",
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            href: "/projects",
            label: t("sidebar.projects") || "Projects",
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground font-sans selection:bg-primary/30">

            {/* ========== SIDEBAR ========== */}
            <aside className="hidden w-[240px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex z-10">

                {/* Logo */}
                <div className="flex h-[60px] items-center gap-3 px-6 border-b border-sidebar-border shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/20">
                         <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                    </div>
                    <span className="text-[15px] font-bold tracking-tight">GorillaProof</span>
                </div>

                {/* + New Proof Button */}
                <div className="px-4 pt-6 pb-2">
                    <Button
                        onClick={() => setIsNewProofOpen(true)}
                        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-medium rounded-xl shadow-md gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Proof
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${isActive(item.href)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                                }`}
                        >
                            <span className={isActive(item.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className="pt-6 pb-2 px-3">
                        <span className="text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                            Configuration
                        </span>
                    </div>
                    <Link
                        href="/settings"
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${isActive("/settings")
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                            }`}
                    >
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                        </svg>
                        {t("sidebar.settings")}
                    </Link>
                </nav>

                {/* User / Account */}
                <div className="border-t border-sidebar-border p-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sidebar-accent/50 transition-colors">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground ring-1 ring-border">
                                    G
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-foreground truncate">Gorilla Studio</p>
                                    <p className="text-[11px] text-muted-foreground truncate">Free plan</p>
                                </div>
                                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-56">
                            <DropdownMenuItem className="cursor-pointer text-[13px]">
                                {t("header.myAccount")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <form action="/auth/logout" method="post">
                                <button type="submit" className="w-full text-left">
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-[13px]">
                                        {t("header.logout")}
                                    </DropdownMenuItem>
                                </button>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* ========== MAIN CONTENT AREA ========== */}
            <div className="flex flex-1 flex-col overflow-hidden bg-background/50 relative">

                {/* Top Header */}
                <header className="flex h-[60px] items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 shrink-0 z-20">

                    {/* Search trigger */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center w-80 h-9 rounded-xl border border-input bg-secondary/30 px-3 text-[13px] text-muted-foreground font-medium cursor-text hover:border-ring/30 hover:bg-secondary/50 transition-colors gap-2"
                    >
                        <svg className="h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span className="flex-1 text-left truncate">{t("header.search")}</span>
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            <span className="text-[11px]">Cmd</span>K
                        </kbd>
                    </button>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        <NotificationsDropdown />

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5 text-[12px] px-3 font-medium border-border/60 hover:bg-secondary/80"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            {t("header.invite")}
                        </Button>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-hidden relative">
                    <div className="h-full w-full overflow-y-auto px-6 py-6 lg:px-8 relative z-10 scroll-smooth">
                        {children}
                    </div>
                </main>
            </div>

            {/* Modals */}
            <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
            <NewProofModal open={isNewProofOpen} onOpenChange={setIsNewProofOpen} />
        </div>
    );
}
