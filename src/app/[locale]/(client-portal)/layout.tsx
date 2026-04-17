"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPortalSidebarData } from "@/lib/actions/client-portal-data";

interface Brand {
    id: string;
    name: string;
    logo_url: string | null;
    agency: string;
}

interface Entity {
    id: string;
    name: string;
    logo_url: string | null;
    role: string;
    brands: Brand[];
}

interface SidebarData {
    userName: string;
    userEmail: string;
    userInitial: string;
    entities: Entity[];
}

export default function ClientPortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);

    useEffect(() => {
        getPortalSidebarData().then((res) => {
            if (res.data) setSidebarData(res.data as SidebarData);
        });
    }, []);

    const isActive = (path: string) => {
        const cleanPath = pathname.replace(/^\/(pt|en)/, "");
        return cleanPath === path || cleanPath.startsWith(path + "/");
    };

    const entityName = sidebarData?.entities?.[0]?.name || "Portal do Cliente";

    return (
        <div className="flex h-screen bg-[oklch(0.10_0.02_240)] text-[oklch(0.75_0.03_240)] font-sans selection:bg-blue-500/30">

            {/* ========== SIDEBAR ========== */}
            <aside className="hidden w-[240px] flex-col border-r border-blue-900/20 bg-[oklch(0.08_0.02_240)] lg:flex z-10">

                {/* Logo */}
                <div className="flex h-[52px] items-center gap-2.5 px-4 border-b border-blue-900/20 shrink-0">
                    <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg shadow-lg"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                    >
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h3.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H17.25m0 0v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v1.5" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold tracking-tight text-blue-50 truncate">{entityName}</p>
                        <p className="text-[10px] text-blue-400/60 font-medium">Portal do Cliente</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 viewer-styled-scrollbar">

                    {/* Dashboard link */}
                    <Link
                        href="/portal"
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive("/portal") && !isActive("/portal/brands")
                            ? "bg-blue-500/10 text-blue-50"
                            : "text-[oklch(0.55_0.03_240)] hover:bg-blue-500/5 hover:text-blue-200"
                            }`}
                    >
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Visão Geral
                    </Link>

                    {/* Brands Section */}
                    <div className="pt-3">
                        <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400/50 mb-1.5">
                            Marcas
                        </p>
                        {sidebarData?.entities?.flatMap(entity =>
                            entity.brands.map(brand => (
                                <Link
                                    key={brand.id}
                                    href={`/portal/brands/${brand.id}`}
                                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive(`/portal/brands/${brand.id}`)
                                        ? "bg-blue-500/10 text-blue-50"
                                        : "text-[oklch(0.55_0.03_240)] hover:bg-blue-500/5 hover:text-blue-200"
                                        }`}
                                >
                                    {brand.logo_url ? (
                                        <Image src={brand.logo_url} alt="" width={18} height={18} className="rounded" />
                                    ) : (
                                        <div className="flex h-[18px] w-[18px] items-center justify-center rounded bg-blue-500/20 text-[9px] font-bold text-blue-300">
                                            {brand.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="flex-1 truncate">{brand.name}</span>
                                    <span className="text-[10px] text-[oklch(0.40_0.02_240)] truncate max-w-[70px]">
                                        {brand.agency}
                                    </span>
                                </Link>
                            ))
                        )}
                        {(!sidebarData || sidebarData.entities.flatMap(e => e.brands).length === 0) && (
                            <p className="px-2.5 py-2 text-[12px] text-[oklch(0.40_0.02_240)] italic">
                                Nenhuma marca vinculada
                            </p>
                        )}
                    </div>
                </nav>

                {/* User / Account */}
                <div className="border-t border-blue-900/20 p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-blue-500/5 transition-colors">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20">
                                    {sidebarData?.userInitial || "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-blue-50 truncate">{sidebarData?.userName || "Carregando..."}</p>
                                    <p className="text-[11px] text-[oklch(0.45_0.03_240)] truncate">{sidebarData?.userEmail || ""}</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-56 bg-[oklch(0.10_0.03_240)] border-blue-900/30 text-blue-100">
                            <DropdownMenuSeparator className="bg-blue-900/20" />
                            <form action="/auth/logout" method="post">
                                <button type="submit" className="w-full text-left">
                                    <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-300 cursor-pointer text-[13px]">
                                        Sair
                                    </DropdownMenuItem>
                                </button>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* ========== MAIN CONTENT AREA ========== */}
            <div className="flex flex-1 flex-col overflow-hidden bg-[oklch(0.12_0.02_240)] relative">

                {/* Top Header */}
                <header className="flex h-[52px] items-center justify-between border-b border-blue-900/20 bg-[oklch(0.12_0.02_240)] px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-blue-200">Portal do Cliente</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Beta</span>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[oklch(0.45_0.03_240)]">
                        <span>Powered by</span>
                        <Image src="/logo-white.png" alt="GorillaProof" width={14} height={11} className="opacity-40" />
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-hidden relative">
                    <div className="h-full w-full overflow-y-auto px-6 py-6 lg:px-8 relative z-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
