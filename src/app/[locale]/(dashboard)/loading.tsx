"use client";

import { BananaSpinner } from "@/components/ui/banana-elements";

export default function DashboardLoading() {
    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto">
            {/* Banana spinner centered while skeleton shows */}
            <div className="flex items-center justify-center py-12">
                <BananaSpinner text="Carregando..." size={40} />
            </div>

            {/* Subtle skeleton below */}
            <div className="animate-pulse opacity-30">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="h-7 w-48 bg-emerald-800/30 rounded-lg" />
                        <div className="h-4 w-32 bg-emerald-800/20 rounded mt-2" />
                    </div>
                    <div className="h-8 w-28 bg-emerald-800/30 rounded-md" />
                </div>
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-xl bg-emerald-800/20 border border-emerald-800/10" />
                    ))}
                </div>
                <div className="h-64 rounded-xl bg-emerald-800/10 border border-emerald-800/10" />
            </div>
        </div>
    );
}
