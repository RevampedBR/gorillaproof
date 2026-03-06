"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    getGroups,
    getProofAssignments,
    assignToProof,
    removeProofAssignment,
    setProofAccessMode,
    getProjectAssignments,
    assignToProject,
    removeProjectAssignment,
    setProjectAccessMode,
} from "@/lib/actions/groups";
import { getOrgMembers, inviteMember } from "@/lib/actions/organization";
import { useToast } from "@/components/ui/toast-provider";

interface AccessAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: "proof" | "project";
    targetId: string;
    targetName: string;
    orgId: string;
    currentAccessMode: string;
}

export function AccessAssignmentDialog({
    isOpen,
    onClose,
    targetType,
    targetId,
    targetName,
    orgId,
    currentAccessMode,
}: AccessAssignmentDialogProps) {
    const { toast } = useToast();
    const [accessMode, setAccessMode] = useState(currentAccessMode || "org_wide");
    const [assignments, setAssignments] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState<"groups" | "people">("groups");
    const [searchQuery, setSearchQuery] = useState("");
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [assignRes, groupsRes, membersRes] = await Promise.all([
            targetType === "proof"
                ? getProofAssignments(targetId)
                : getProjectAssignments(targetId),
            getGroups(orgId),
            getOrgMembers(orgId),
        ]);
        setAssignments(assignRes.data || []);
        setGroups(groupsRes.data || []);
        setMembers(membersRes.data || []);
        setLoading(false);
    }, [targetType, targetId, orgId]);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    useEffect(() => {
        setAccessMode(currentAccessMode || "org_wide");
    }, [currentAccessMode]);

    const handleToggleMode = async () => {
        const newMode = accessMode === "org_wide" ? "restricted" : "org_wide";
        const fn = targetType === "proof" ? setProofAccessMode : setProjectAccessMode;
        const { error } = await fn(targetId, newMode);
        if (error) {
            toast(error, "error");
        } else {
            setAccessMode(newMode);
            toast(
                newMode === "restricted"
                    ? "Acesso restrito ativado. Apenas membros e grupos atribuídos podem acessar."
                    : "Acesso aberto. Todos os membros da organização podem acessar.",
                "success"
            );
        }
    };

    const handleAssign = async (target: { groupId?: string; userId?: string }) => {
        setAssigning(true);
        const fn = targetType === "proof" ? assignToProof : assignToProject;
        const { error } = await fn(targetId, target);
        setAssigning(false);
        if (error) {
            toast(error, "error");
        } else {
            toast("Acesso atribuído. O membro será notificado.", "success");
            fetchData();
        }
    };

    const handleRemove = async (assignmentId: string) => {
        const fn = targetType === "proof"
            ? () => removeProofAssignment(assignmentId, targetId)
            : () => removeProjectAssignment(assignmentId);
        const { error } = await fn();
        if (error) {
            toast(error, "error");
        } else {
            fetchData();
        }
    };

    const handleInviteAndAssign = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        const result = await inviteMember(orgId, inviteEmail, "member");
        setInviting(false);

        if (result.error) {
            toast(result.error, "error");
        } else {
            toast(`Convite enviado para ${inviteEmail}`, "success");
            setInviteEmail("");
            setShowInvite(false);
            // Refresh data so the new member appears
            await fetchData();
        }
    };

    const assignedGroupIds = assignments.filter(a => a.group_id).map(a => a.group_id);
    const assignedUserIds = assignments.filter(a => a.user_id).map(a => a.user_id);
    const availableGroups = groups.filter(g => !assignedGroupIds.includes(g.id));
    const availableMembers = members.filter(m => !assignedUserIds.includes(m.user_id));

    // Filtered results based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return availableGroups;
        const q = searchQuery.toLowerCase();
        return availableGroups.filter(g =>
            g.name.toLowerCase().includes(q) ||
            (g.description || "").toLowerCase().includes(q)
        );
    }, [availableGroups, searchQuery]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return availableMembers;
        const q = searchQuery.toLowerCase();
        return availableMembers.filter(m =>
            (m.name || "").toLowerCase().includes(q) ||
            (m.email || "").toLowerCase().includes(q)
        );
    }, [availableMembers, searchQuery]);

    if (!isOpen) return null;

    const targetLabel = targetType === "proof" ? "prova" : "projeto";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[15px] font-semibold text-white">Controle de Acesso</h2>
                            <p className="text-[12px] text-zinc-500 mt-0.5 truncate max-w-[300px]">{targetName}</p>
                        </div>
                        <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Access Mode Toggle */}
                    <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                        <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accessMode === "restricted"
                                ? "bg-amber-500/15 border border-amber-500/20"
                                : "bg-emerald-500/15 border border-emerald-500/20"
                                }`}>
                                {accessMode === "restricted" ? (
                                    <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className="text-[12px] font-medium text-zinc-200">
                                    {accessMode === "restricted" ? "Acesso Restrito" : "Equipe Inteira"}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                    {accessMode === "restricted"
                                        ? "Apenas atribuídos podem acessar"
                                        : "Todos da organização veem"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleMode}
                            className={`relative h-6 w-11 rounded-full transition-colors ${accessMode === "restricted" ? "bg-amber-500" : "bg-zinc-600"
                                }`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${accessMode === "restricted" ? "left-[22px]" : "left-0.5"
                                }`} />
                        </button>
                    </div>
                </div>

                {/* Body — Assignments */}
                <div className="max-h-[400px] overflow-y-auto viewer-styled-scrollbar">
                    {loading ? (
                        <div className="p-5 animate-pulse space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-7 w-7 rounded-full bg-zinc-800" />
                                    <div className="h-3 w-24 bg-zinc-800 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : accessMode === "org_wide" ? (
                        <div className="p-8 text-center">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[13px] text-zinc-300 font-medium">Acesso aberto</p>
                            <p className="text-[11px] text-zinc-600 mt-1">
                                Todos os membros da organização podem visualizar esta {targetLabel}.
                                <br />Ative o &ldquo;Acesso Restrito&rdquo; para limitar o acesso.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Current Assignments */}
                            {assignments.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-[12px] text-amber-400/80">
                                        Nenhum acesso atribuído. Apenas admins podem ver esta {targetLabel}.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/30">
                                    {assignments.map((a: any) => (
                                        <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/15 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                {a.group_id ? (
                                                    <>
                                                        <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-medium text-zinc-300">
                                                                {a.contact_groups?.name || "Grupo"}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-600">Grupo</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                            {(a.users?.full_name || a.users?.email || "?").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-medium text-zinc-300">
                                                                {a.users?.full_name || a.users?.email || "Membro"}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-600">Individual</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemove(a.id)}
                                                className="h-6 w-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                            >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Assignment */}
                            <div className="border-t border-zinc-800/40 p-4 space-y-3">
                                {!showPicker ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => { setShowPicker(true); setSearchQuery(""); }}
                                            className="flex items-center gap-1.5 text-[12px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                            Atribuir acesso
                                        </button>
                                        <button
                                            onClick={() => setShowInvite(true)}
                                            className="flex items-center gap-1.5 text-[12px] text-teal-400 hover:text-teal-300 font-medium transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                            Convidar por e-mail
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Search input */}
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder="Buscar grupos ou pessoas..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full h-8 pl-9 pr-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Picker Tabs */}
                                        <div className="flex gap-1 p-0.5 bg-zinc-800/40 rounded-lg w-fit">
                                            <button
                                                onClick={() => setPickerTab("groups")}
                                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${pickerTab === "groups"
                                                    ? "bg-zinc-700 text-white"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                Grupos {filteredGroups.length > 0 && `(${filteredGroups.length})`}
                                            </button>
                                            <button
                                                onClick={() => setPickerTab("people")}
                                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${pickerTab === "people"
                                                    ? "bg-zinc-700 text-white"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                Pessoas {filteredMembers.length > 0 && `(${filteredMembers.length})`}
                                            </button>
                                        </div>

                                        <div className="max-h-40 overflow-y-auto space-y-0.5 viewer-styled-scrollbar">
                                            {pickerTab === "groups" ? (
                                                filteredGroups.length === 0 ? (
                                                    <p className="text-[11px] text-zinc-600 py-2">
                                                        {searchQuery ? "Nenhum grupo encontrado." : "Nenhum grupo disponível."}
                                                    </p>
                                                ) : (
                                                    filteredGroups.map(g => (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => handleAssign({ groupId: g.id })}
                                                            disabled={assigning}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left disabled:opacity-50"
                                                        >
                                                            <div className="h-6 w-6 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-[12px] text-zinc-300 font-medium">{g.name}</span>
                                                                <span className="text-[10px] text-zinc-600 ml-1.5">
                                                                    {g.member_count} membro{g.member_count !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-400/60 shrink-0">+ Atribuir</span>
                                                        </button>
                                                    ))
                                                )
                                            ) : (
                                                filteredMembers.length === 0 ? (
                                                    <div className="py-2 space-y-2">
                                                        <p className="text-[11px] text-zinc-600">
                                                            {searchQuery ? "Nenhuma pessoa encontrada." : "Todos os membros já estão atribuídos."}
                                                        </p>
                                                        {!showInvite && (
                                                            <button
                                                                onClick={() => { setShowPicker(false); setShowInvite(true); }}
                                                                className="text-[11px] text-teal-400 hover:text-teal-300 font-medium transition-colors flex items-center gap-1"
                                                            >
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                                </svg>
                                                                Convidar novo membro por e-mail
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    filteredMembers.map(m => (
                                                        <button
                                                            key={m.user_id}
                                                            onClick={() => handleAssign({ userId: m.user_id })}
                                                            disabled={assigning}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left disabled:opacity-50"
                                                        >
                                                            <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                                {(m.name || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[12px] text-zinc-300 truncate">{m.name || m.email || "Membro"}</p>
                                                                {m.email && <p className="text-[10px] text-zinc-600 truncate">{m.email}</p>}
                                                            </div>
                                                            <span className="text-[10px] text-emerald-400/60 shrink-0">+ Atribuir</span>
                                                        </button>
                                                    ))
                                                )
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <button
                                                onClick={() => { setShowPicker(false); setSearchQuery(""); }}
                                                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                Fechar
                                            </button>
                                            {!showInvite && (
                                                <button
                                                    onClick={() => { setShowPicker(false); setShowInvite(true); }}
                                                    className="flex items-center gap-1 text-[11px] text-teal-400/70 hover:text-teal-300 font-medium transition-colors"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                    </svg>
                                                    Convidar novo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Inline Invite */}
                                {showInvite && (
                                    <div className="space-y-2 pt-2 border-t border-zinc-800/30">
                                        <p className="text-[11px] text-zinc-500 font-medium">Convidar novo membro por e-mail:</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                                <input
                                                    type="email"
                                                    placeholder="nome@empresa.com"
                                                    value={inviteEmail}
                                                    onChange={e => setInviteEmail(e.target.value)}
                                                    onKeyDown={e => e.key === "Enter" && handleInviteAndAssign()}
                                                    className="w-full h-8 pl-9 pr-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                onClick={handleInviteAndAssign}
                                                disabled={inviting || !inviteEmail.trim()}
                                                className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors"
                                            >
                                                {inviting ? "..." : "Convidar"}
                                            </button>
                                            <button
                                                onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                                                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-zinc-600">
                                            O membro será convidado para a organização. Depois, atribua-o a esta {targetLabel}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
