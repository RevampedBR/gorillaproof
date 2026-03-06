"use server";

import { createClient } from "@/utils/supabase/server";

export async function generateDashboardCsv() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { csv: null, error: "Não autenticado" };

    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

    if (!membership) return { csv: null, error: "Sem organização" };

    const { data: proofs, error } = await supabase
        .from("proofs")
        .select(`
            id, title, status, deadline, tags, created_at, updated_at,
            projects ( title, organization_id, clients ( name ) )
        `)
        .order("created_at", { ascending: false });

    if (error) return { csv: null, error: error.message };

    const now = new Date();
    const statusLabels: Record<string, string> = {
        draft: "Rascunho",
        awaiting_review: "Aguardando Revisão",
        in_review: "Em Revisão",
        approved: "Aprovado",
        approved_with_changes: "Aprovado com Alterações",
        changes_requested: "Alterações Solicitadas",
        rejected: "Rejeitado",
        not_relevant: "Não Relevante",
    };

    const escape = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };

    const headers = [
        "Título", "Status", "Cliente", "Projeto", "Tags",
        "Deadline", "Dias Restantes", "Criado em", "Atualizado em",
    ];

    const rows = (proofs ?? []).map((p: any) => {
        const client = p.projects?.clients?.name || "—";
        const project = p.projects?.title || "—";
        const tags = Array.isArray(p.tags) ? p.tags.join("; ") : "";
        const deadline = p.deadline
            ? new Date(p.deadline).toLocaleDateString("pt-BR")
            : "—";
        const daysLeft = p.deadline
            ? Math.ceil((new Date(p.deadline).getTime() - now.getTime()) / 86400000)
            : null;
        const daysStr = daysLeft !== null
            ? daysLeft < 0 ? `${Math.abs(daysLeft)} dias atrasado` : `${daysLeft} dias`
            : "—";

        return [
            escape(p.title || ""),
            statusLabels[p.status] || p.status,
            escape(client),
            escape(project),
            escape(tags),
            deadline,
            daysStr,
            new Date(p.created_at).toLocaleDateString("pt-BR"),
            new Date(p.updated_at).toLocaleDateString("pt-BR"),
        ].join(",");
    });

    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const csv = bom + headers.join(",") + "\n" + rows.join("\n");

    return { csv, error: null };
}
