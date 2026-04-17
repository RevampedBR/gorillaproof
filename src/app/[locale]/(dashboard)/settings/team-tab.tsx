"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getOrgMembers, inviteMember, getPendingInvites, cancelInvite, resendInvite } from "@/lib/actions/organization";
import { useToast } from "@/components/ui/toast-provider";

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
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"member" | "reviewer">("member");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteSentTo, setInviteSentTo] = useState("");
    const { toast } = useToast();

    // Pending invites state
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const loadMembers = () => {
        getOrgMembers(orgId).then(({ data }) => {
            setMembers(data || []);
            setLoading(false);
        });
    };

    const loadPending = () => {
        getPendingInvites(orgId).then(({ data }) => {
            setPendingInvites(data || []);
            setLoadingPending(false);
        });
    };

    useEffect(() => { loadMembers(); loadPending(); }, [orgId]);

    const handleCancelInvite = async (memberId: string) => {
        if (!confirm("Cancelar este convite? O e-mail de convite será invalidado.")) return;
        setActioningId(memberId);
        const { error } = await cancelInvite(orgId, memberId);
        setActioningId(null);
        if (error) {
            toast(error, "error");
        } else {
            toast("Convite cancelado.", "success");
            loadPending();
            loadMembers();
        }
    };

    const handleResendInvite = async (memberId: string) => {
        setActioningId(memberId);
        const { error } = await resendInvite(orgId, memberId);
        setActioningId(null);
        if (error) {
            toast(error, "error");
        } else {
            toast("Convite reenviado com sucesso.", "success");
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setInviteError("");
        const result = await inviteMember(orgId, inviteEmail, inviteRole);
        setInviting(false);
        if (result.error) {
            setInviteError(result.error);
        } else {
            setInviteSentTo(inviteEmail);
            setInviteEmail("");
            setInviteRole("member");
            loadMembers();
            loadPending();
        }
    };

    const closeInvite = () => {
        setShowInvite(false);
        setInviteEmail("");
        setInviteError("");
        setInviteSentTo("");
    };

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
            {/* ── Pending Invites Section ── */}
            {!loadingPending && pendingInvites.length > 0 && (
                <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-amber-500/10 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-amber-300">Convites Pendentes</h3>
                            <p className="text-[12px] text-zinc-500">
                                {pendingInvites.length} convite{pendingInvites.length !== 1 ? "s" : ""} aguardando aceitação.
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-zinc-800/30">
                        {pendingInvites.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-4 px-6 hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-zinc-300">{inv.email}</p>
                                        <p className="text-[12px] text-zinc-500">
                                            Convidado em {new Date(inv.invited_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                            {" · "}
                                            <span className="capitalize">{ROLE_LABELS[inv.role] || inv.role}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="px-2.5 py-1 rounded-md border text-[11px] font-medium bg-amber-500/10 text-amber-400 border-amber-500/20">
                                        Pendente
                                    </div>
                                    <button
                                        onClick={() => handleResendInvite(inv.id)}
                                        disabled={actioningId === inv.id}
                                        className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                        title="Reenviar convite"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleCancelInvite(inv.id)}
                                        disabled={actioningId === inv.id}
                                        className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Cancelar convite"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">Equipe do Workspace</h3>
                        <p className="text-[12px] text-zinc-400 mt-1">
                            {members.length} membro{members.length !== 1 ? "s" : ""} na sua organização.
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowInvite(true)}
                        className="h-9 px-4 rounded-lg text-white text-[12px] font-semibold transition-colors"
                        style={{ backgroundColor: 'var(--brand)' }}
                    >
                        + Convidar Membro
                    </Button>
                </div>

                {/* ── Invite inline form ── */}
                {showInvite && (
                    <div className="p-6 border-b border-zinc-800/40 bg-zinc-800/20">
                        {/* Success banner */}
                        {inviteSentTo && (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-emerald-300">Convite enviado!</p>
                                    <p className="text-[12px] text-emerald-400/70 mt-0.5">
                                        Um e-mail foi enviado para <strong className="text-emerald-300">{inviteSentTo}</strong> com um link para criar a conta e acessar o workspace.
                                    </p>
                                </div>
                                <button onClick={() => setInviteSentTo("")} className="text-[12px] text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap px-3 py-1.5 rounded-md hover:bg-emerald-500/10 transition-colors">
                                    Convidar outro
                                </button>
                            </div>
                        )}

                        {!inviteSentTo && (
                            <div className="flex flex-col gap-4">
                                {/* Email input */}
                                <div>
                                    <label className="text-[12px] font-medium text-zinc-300 mb-1.5 block">E-mail da pessoa</label>
                                    <input
                                        type="email"
                                        placeholder="nome@empresa.com"
                                        value={inviteEmail}
                                        onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
                                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                        className="w-full h-10 rounded-lg bg-zinc-900/80 border border-zinc-700/50 px-3 text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                        autoFocus
                                    />
                                </div>

                                {/* Role selection — radio cards */}
                                <div>
                                    <label className="text-[12px] font-medium text-zinc-300 mb-2 block">Função no workspace</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole("member")}
                                            className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${inviteRole === "member"
                                                ? "border-zinc-500/60 bg-zinc-800/60"
                                                : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/50"
                                                }`}
                                            style={inviteRole === "member" ? { borderColor: 'var(--brand-glow)', backgroundColor: 'var(--brand-soft)' } : undefined}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${inviteRole === "member" ? "border-current" : "border-zinc-600"}`} style={inviteRole === "member" ? { color: 'var(--brand)' } : undefined}>
                                                    {inviteRole === "member" && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--brand)' }} />}
                                                </div>
                                                <span className="text-[13px] font-semibold text-white">Membro</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed pl-5.5">
                                                Acessa o dashboard, cria e gerencia provas, comenta, e colabora com a equipe.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole("reviewer")}
                                            className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${inviteRole === "reviewer"
                                                ? "border-zinc-500/60 bg-zinc-800/60"
                                                : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/50"
                                                }`}
                                            style={inviteRole === "reviewer" ? { borderColor: 'var(--brand-glow)', backgroundColor: 'var(--brand-soft)' } : undefined}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${inviteRole === "reviewer" ? "border-current" : "border-zinc-600"}`} style={inviteRole === "reviewer" ? { color: 'var(--brand)' } : undefined}>
                                                    {inviteRole === "reviewer" && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--brand)' }} />}
                                                </div>
                                                <span className="text-[13px] font-semibold text-white">Revisor Interno</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed pl-5.5">
                                                Apenas revisa provas atribuídas. Não cria provas nem acessa configurações.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* Error message */}
                                {inviteError && (
                                    <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                        {inviteError}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-[11px] text-zinc-500">
                                        Um e-mail será enviado com link para criar conta e acessar o workspace.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={closeInvite}
                                            className="h-9 px-4 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-700/40 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <Button
                                            onClick={handleInvite}
                                            disabled={inviting || !inviteEmail.trim()}
                                            className="h-9 px-5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
                                            style={{ backgroundColor: 'var(--brand)' }}
                                        >
                                            {inviting ? "Enviando..." : "Enviar Convite"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--brand-glow)' }}>
                                        <span className="text-[14px] font-bold" style={{ color: 'var(--brand)' }}>
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
