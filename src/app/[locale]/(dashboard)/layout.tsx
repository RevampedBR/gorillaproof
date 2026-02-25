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
            href: "/clients",
            label: t("sidebar.clients"),
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            href: "/projects",
            label: t("sidebar.projects"),
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
            ),
        },
        {
            href: "/proofs",
            label: t("sidebar.allProofs"),
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-indigo-500/30">

            {/* ========== SIDEBAR ========== */}
            <aside className="hidden w-[220px] flex-col border-r border-zinc-800/60 bg-zinc-950 lg:flex z-10">

                {/* Logo */}
                <div className="flex h-[52px] items-center gap-2.5 px-4 border-b border-zinc-800/60 shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/20">
                        <Image
                            src="https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_38,h_30,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png"
                            alt="GP"
                            width={16}
                            height={13}
                            className="brightness-200"
                        />
                    </div>
                    <span className="text-[14px] font-semibold tracking-tight text-zinc-100">GorillaProof</span>
                </div>

                {/* + New Proof Button */}
                <div className="px-3 pt-4 pb-2">
                    <Button
                        onClick={() => setIsNewProofOpen(true)}
                        className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium rounded-lg shadow-sm gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t("header.newProof")}
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive(item.href)
                                    ? "bg-zinc-800/80 text-zinc-100"
                                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                                }`}
                        >
                            <span className={isActive(item.href) ? "text-indigo-400" : ""}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className="pt-4 pb-1 px-2">
                        <span className="text-[11px] font-semibold tracking-wider text-zinc-600 uppercase">
                            {t("sidebar.settings")}
                        </span>
                    </div>
                    <Link
                        href="/settings"
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive("/settings")
                                ? "bg-zinc-800/80 text-zinc-100"
                                : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                            }`}
                    >
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t("sidebar.settings")}
                    </Link>
                </nav>

                {/* User / Account */}
                <div className="border-t border-zinc-800/60 p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/40 transition-colors">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 ring-1 ring-zinc-700">
                                    G
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-zinc-200 truncate">Gorilla Studio</p>
                                    <p className="text-[11px] text-zinc-500 truncate">Free plan</p>
                                </div>
                                <svg className="h-4 w-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer text-[13px]">
                                {t("header.myAccount")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <form action="/auth/logout" method="post">
                                <button type="submit" className="w-full text-left">
                                    <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-300 cursor-pointer text-[13px]">
                                        {t("header.logout")}
                                    </DropdownMenuItem>
                                </button>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* ========== MAIN CONTENT AREA ========== */}
            <div className="flex flex-1 flex-col overflow-hidden bg-[#18181B] relative">

                {/* Top Header */}
                <header className="flex h-[52px] items-center justify-between border-b border-zinc-800/60 bg-[#18181B] px-4 shrink-0">

                    {/* Search trigger */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center w-72 h-8 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-[13px] text-zinc-500 font-medium cursor-text hover:border-zinc-700 transition-colors gap-2"
                    >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span className="flex-1 text-left truncate">Search proofs and projects...</span>
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                            <span className="text-[11px]">Cmd</span>K
                        </kbd>
                    </button>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        <NotificationsDropdown />

                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 text-[12px] px-2.5"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Invite
                        </Button>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-hidden relative">
                    <div className="h-full w-full overflow-y-auto px-6 py-6 lg:px-8 relative z-10">
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
