"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getOrgMembers } from "@/lib/actions/organization";

interface TeamTabProps {
    orgId: string;
}

const ROLE_LABELS: Record<string, string> = {
    owner: "Proprietário",
    admin: "Admin",
    member: "Membro",
    reviewer: "Revisor Interno",
};

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    admin: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    member: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
    reviewer: "bg-teal-500/15 text-teal-400 border-teal-500/20",
};

export function TeamTab({ orgId }: TeamTabProps) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOrgMembers(orgId).then(({ data }) => {
            setMembers(data || []);
            setLoading(false);
        });
    }, [orgId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-zinc-800" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-32 bg-zinc-800 rounded" />
                                    <div className="h-3 w-48 bg-zinc-800/60 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">Equipe do Workspace</h3>
                        <p className="text-[12px] text-zinc-400 mt-1">
                            {members.length} membro{members.length !== 1 ? "s" : ""} na sua organização.
                        </p>
                    </div>
                    <Button className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-colors shadow-lg shadow-emerald-500/20">
                        + Convidar Membro
                    </Button>
                </div>

                {members.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="h-12 w-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                            <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        </div>
                        <p className="text-[13px] text-zinc-400">Nenhum membro encontrado.</p>
                        <p className="text-[11px] text-zinc-600 mt-1">Convide membros da sua equipe para colaborar.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/30">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 px-6 hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                                        <span className="text-[14px] font-bold text-emerald-400">
                                            {(member.name || "?").charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-zinc-200">{member.name || "Membro"}</p>
                                        <p className="text-[12px] text-zinc-500">{member.email || "—"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`px-3 py-1.5 rounded-md border text-[12px] font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                                        {ROLE_LABELS[member.role] || member.role}
                                    </div>

                                    {member.role !== "owner" && (
                                        <button className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
