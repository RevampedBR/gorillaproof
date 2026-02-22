"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsDropdown() {
    const [hasUnread] = useState(false);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {hasUnread && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-80 bg-zinc-950 border-zinc-800 text-zinc-300 p-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                    <h3 className="text-[13px] font-semibold text-zinc-100">Notifications</h3>
                    <button className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Mark all read
                    </button>
                </div>

                {/* Empty state */}
                <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-zinc-800/60 flex items-center justify-center">
                        <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <p className="text-[13px] font-medium text-zinc-400">No notifications yet</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                        You&apos;ll see updates when comments, decisions, or uploads happen.
                    </p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
