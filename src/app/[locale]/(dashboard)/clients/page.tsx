"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { ClientsListClient } from "./client";

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchClients() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: memberships } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id);

            if (!memberships || memberships.length === 0) {
                setLoading(false);
                return;
            }

            const orgIds = memberships.map((m) => m.organization_id);

            const { data } = await supabase
                .from("clients")
                .select(`
                    id, name, description, logo_url, status,
                    organization_id, created_at, updated_at,
                    projects (
                        id, name, status,
                        proofs ( id, title, status, tags, updated_at )
                    )
                `)
                .in("organization_id", orgIds)
                .order("updated_at", { ascending: false });

            setClients(data ?? []);
            setLoading(false);
        }
        fetchClients();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <svg className="h-8 w-8 animate-spin text-zinc-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-[12px] text-zinc-500">Carregando clientes...</span>
                </div>
            </div>
        );
    }

    return <ClientsListClient clients={clients} />;
}
