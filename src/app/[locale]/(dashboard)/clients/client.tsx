"use client";

import { useTranslations } from "next-intl";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";

interface Client {
    id: string;
    name: string;
    logo_url: string | null;
    created_at: string;
}

export function ClientsListClient({ clients }: { clients: Client[] }) {
    const t = useTranslations("dashboard.clients");

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                        {t("title")}
                    </h1>
                    <p className="text-[13px] text-zinc-500 mt-1">
                        {t("subtitle")}
                    </p>
                </div>
                <CreateClientDialog>
                    <button className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium transition-colors flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t("createTitle")}
                    </button>
                </CreateClientDialog>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => (
                    <div
                        key={client.id}
                        className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all flex items-center gap-4"
                    >
                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-zinc-200">
                                {client.name}
                            </h3>
                            <p className="text-[11px] text-zinc-500">
                                {t("addedOn")} {new Date(client.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {clients.length === 0 && (
                <div className="text-center py-20 text-zinc-500 text-sm">
                    {t("noClients")}
                </div>
            )}
        </div>
    );
}
