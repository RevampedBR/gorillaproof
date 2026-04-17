"use client";

import { Link } from "@/i18n/navigation";

interface ProofItem {
    id: string;
    title: string;
    status: string;
    updated_at: string;
    deadline: string | null;
    client_name: string;
    client_logo: string | null;
}

interface DashboardData {
    totalProofs: number;
    pendingReview: number;
    approved: number;
    recentProofs: ProofItem[];
    clientCount: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Rascunho", color: "text-gray-400", bg: "bg-gray-500/10" },
    in_review: { label: "Em Revisão", color: "text-amber-400", bg: "bg-amber-500/10" },
    approved: { label: "Aprovado", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    rejected: { label: "Rejeitado", color: "text-red-400", bg: "bg-red-500/10" },
    changes_requested: { label: "Alterações", color: "text-orange-400", bg: "bg-orange-500/10" },
};

export default function PortalDashboardClient({ data }: { data: DashboardData | null }) {
    const dashboard = data || { totalProofs: 0, pendingReview: 0, approved: 0, recentProofs: [], clientCount: 0 };

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-blue-50 tracking-tight">Visão Geral</h1>
                <p className="text-[13px] text-[oklch(0.50_0.03_240)] mt-1">
                    Acompanhe todas as provas e revisões das suas marcas
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Total de Provas"
                    value={dashboard.totalProofs}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0013.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    }
                    color="blue"
                />
                <StatCard
                    label="Aguardando Revisão"
                    value={dashboard.pendingReview}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    color="amber"
                />
                <StatCard
                    label="Aprovadas"
                    value={dashboard.approved}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    color="emerald"
                />
                <StatCard
                    label="Marcas"
                    value={dashboard.clientCount}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                    }
                    color="purple"
                />
            </div>

            {/* Recent Proofs */}
            <div className="rounded-xl border border-blue-900/20 bg-[oklch(0.10_0.02_240)]">
                <div className="px-4 py-3 border-b border-blue-900/15">
                    <h2 className="text-[14px] font-semibold text-blue-100">Provas Recentes</h2>
                </div>
                {dashboard.recentProofs.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        <svg className="h-10 w-10 mx-auto text-blue-500/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0013.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m-3 0h.375a.375.375 0 01.375.375v.375m3-3.75h.375a.375.375 0 01.375.375v.375m3-3.75h.375a.375.375 0 01.375.375V15" />
                        </svg>
                        <p className="text-[13px] text-[oklch(0.45_0.03_240)]">
                            Nenhuma prova para exibir ainda
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-blue-900/10">
                        {dashboard.recentProofs.map((proof) => {
                            const status = statusConfig[proof.status] || statusConfig.draft;
                            return (
                                <Link
                                    key={proof.id}
                                    href={`/proofs/${proof.id}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/5 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-blue-50 truncate">{proof.title}</p>
                                        <p className="text-[11px] text-[oklch(0.45_0.03_240)] mt-0.5">{proof.client_name}</p>
                                    </div>
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-[11px] text-[oklch(0.40_0.02_240)] shrink-0">
                                        {new Date(proof.updated_at).toLocaleDateString("pt-BR")}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/15",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/15",
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/15",
    };
    const classes = colorMap[color] || colorMap.blue;
    const [textColor, bgColor, borderColor] = classes.split(" ");

    return (
        <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
            <div className={`${textColor} mb-2`}>{icon}</div>
            <p className="text-2xl font-bold text-blue-50">{value}</p>
            <p className="text-[11px] text-[oklch(0.50_0.03_240)] mt-0.5">{label}</p>
        </div>
    );
}
