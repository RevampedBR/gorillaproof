"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrgMembers } from "@/lib/actions/organization";
import {
    getGroups,
    createGroup,
    deleteGroup,
    getGroupMembers,
    addGroupMember,
    removeGroupMember,
} from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface MembersClientProps {
    orgId: string;
    userRole: string;
    userId: string;
}

const ROLE_LABELS: Record<string, string> = {
    owner: "Proprietário",
    admin: "Admin",
    member: "Membro",
    reviewer: "Revisor",
};

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    admin: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    member: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
    reviewer: "bg-teal-500/15 text-teal-400 border-teal-500/20",
};

export function MembersClient({ orgId, userRole, userId }: MembersClientProps) {
    const isAdmin = userRole === "owner" || userRole === "admin";
    const { toast } = useToast();
    const [tab, setTab] = useState<"people" | "groups">("people");

    // People state
    const [members, setMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    // Groups state
    const [groups, setGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDesc, setNewGroupDesc] = useState("");
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Expanded group (showing members)
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

    // Add member to group
    const [showAddMember, setShowAddMember] = useState(false);
    const [addingMember, setAddingMember] = useState(false);

    const fetchMembers = useCallback(async () => {
        const { data } = await getOrgMembers(orgId);
        setMembers(data || []);
        setLoadingMembers(false);
    }, [orgId]);

    const fetchGroups = useCallback(async () => {
        const { data } = await getGroups(orgId);
        setGroups(data || []);
        setLoadingGroups(false);
    }, [orgId]);

    useEffect(() => {
        fetchMembers();
        fetchGroups();
    }, [fetchMembers, fetchGroups]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setCreatingGroup(true);
        const { error } = await createGroup(orgId, newGroupName, newGroupDesc || undefined);
        setCreatingGroup(false);
        if (error) {
            toast(error, "error");
        } else {
            toast(`"${newGroupName}" foi criado com sucesso.`, "success");
            setNewGroupName("");
            setNewGroupDesc("");
            setShowCreateGroup(false);
            fetchGroups();
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!confirm(`Excluir o grupo "${groupName}"? Isso removerá todas as atribuições de acesso deste grupo.`)) return;
        const { error } = await deleteGroup(groupId);
        if (error) {
            toast(error, "error");
        } else {
            toast(`"${groupName}" foi removido.`, "success");
            if (expandedGroupId === groupId) setExpandedGroupId(null);
            fetchGroups();
        }
    };

    const handleExpandGroup = async (groupId: string) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
            return;
        }
        setExpandedGroupId(groupId);
        setLoadingGroupMembers(true);
        setShowAddMember(false);
        const { data } = await getGroupMembers(groupId);
        setGroupMembers(data || []);
        setLoadingGroupMembers(false);
    };

    const handleAddMemberToGroup = async (memberId: string) => {
        if (!expandedGroupId) return;
        setAddingMember(true);
        const { error } = await addGroupMember(expandedGroupId, memberId);
        setAddingMember(false);
        if (error) {
            toast(error, "error");
        } else {
            toast("Membro adicionado", "success");
            const { data } = await getGroupMembers(expandedGroupId);
            setGroupMembers(data || []);
            fetchGroups();
        }
    };

    const handleRemoveMemberFromGroup = async (membershipId: string) => {
        const { error } = await removeGroupMember(membershipId);
        if (error) {
            toast(error, "error");
        } else {
            if (expandedGroupId) {
                const { data } = await getGroupMembers(expandedGroupId);
                setGroupMembers(data || []);
            }
            fetchGroups();
        }
    };

    const existingGroupUserIds = groupMembers.map((gm: any) => gm.user_id);
    const availableMembers = members.filter(m => !existingGroupUserIds.includes(m.user_id));

    // ── Skeleton ──
    const Skeleton = () => (
        <div className="animate-pulse space-y-4 p-6">
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
    );

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Equipe</h1>
                <p className="text-[13px] text-zinc-400 mt-1">
                    Gerencie os membros da sua organização e organize-os em grupos de acesso.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl w-fit">
                <button
                    onClick={() => setTab("people")}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === "people"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Pessoas
                    </span>
                </button>
                <button
                    onClick={() => setTab("groups")}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === "groups"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        Grupos
                        {groups.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-400">
                                {groups.length}
                            </span>
                        )}
                    </span>
                </button>
            </div>

            {/* ═══════════════════ PEOPLE TAB ═══════════════════ */}
            {tab === "people" && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-zinc-800/40 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Membros da Organização</h3>
                            <p className="text-[12px] text-zinc-500 mt-0.5">
                                {members.length} membro{members.length !== 1 ? "s" : ""} ativos.
                            </p>
                        </div>
                    </div>

                    {loadingMembers ? (
                        <Skeleton />
                    ) : members.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-[13px] text-zinc-400">Nenhum membro encontrado.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/30">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 px-5 hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                            <span className="text-[13px] font-bold text-indigo-400">
                                                {(member.name || "?").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-zinc-200">
                                                {member.name || "Membro"}
                                                {member.user_id === userId && (
                                                    <span className="ml-1.5 text-[10px] text-zinc-500">(você)</span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-zinc-500">{member.email || "—"}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-md border text-[11px] font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                                        {ROLE_LABELS[member.role] || member.role}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════ GROUPS TAB ═══════════════════ */}
            {tab === "groups" && (
                <div className="space-y-4">
                    {/* Create Group */}
                    {isAdmin && (
                        <div>
                            {!showCreateGroup ? (
                                <Button
                                    onClick={() => setShowCreateGroup(true)}
                                    className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Novo Grupo
                                </Button>
                            ) : (
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 space-y-4">
                                    <h3 className="text-sm font-semibold text-white">Criar Grupo</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Nome do grupo (ex: Marketing)"
                                            value={newGroupName}
                                            onChange={e => setNewGroupName(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            placeholder="Descrição (opcional)"
                                            value={newGroupDesc}
                                            onChange={e => setNewGroupDesc(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleCreateGroup}
                                            disabled={creatingGroup || !newGroupName.trim()}
                                            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium disabled:opacity-50"
                                        >
                                            {creatingGroup ? "Criando..." : "Criar"}
                                        </Button>
                                        <Button
                                            onClick={() => { setShowCreateGroup(false); setNewGroupName(""); setNewGroupDesc(""); }}
                                            variant="ghost"
                                            className="h-8 px-3 rounded-lg text-zinc-400 hover:text-zinc-200 text-[12px]"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Groups List */}
                    {loadingGroups ? (
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                            <Skeleton />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-12 text-center">
                            <div className="h-12 w-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                                <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                            </div>
                            <p className="text-[13px] text-zinc-400">Nenhum grupo criado.</p>
                            <p className="text-[11px] text-zinc-600 mt-1">
                                Crie grupos para organizar membros e controlar acesso a provas e projetos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groups.map((group: any) => (
                                <div key={group.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        className="flex items-center justify-between p-4 px-5 cursor-pointer hover:bg-zinc-800/20 transition-colors"
                                        onClick={() => handleExpandGroup(group.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-semibold text-zinc-200">{group.name}</p>
                                                <p className="text-[11px] text-zinc-500">
                                                    {group.member_count} membro{group.member_count !== 1 ? "s" : ""}
                                                    {group.description && ` · ${group.description}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDeleteGroup(group.id, group.name); }}
                                                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-600 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                </button>
                                            )}
                                            <svg
                                                className={`h-4 w-4 text-zinc-600 transition-transform ${expandedGroupId === group.id ? "rotate-180" : ""}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Expanded: Group Members */}
                                    {expandedGroupId === group.id && (
                                        <div className="border-t border-zinc-800/40">
                                            {loadingGroupMembers ? (
                                                <div className="p-4">
                                                    <div className="animate-pulse space-y-3">
                                                        {[1, 2].map(i => (
                                                            <div key={i} className="flex items-center gap-3">
                                                                <div className="h-7 w-7 rounded-full bg-zinc-800" />
                                                                <div className="h-3 w-24 bg-zinc-800 rounded" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {groupMembers.length === 0 ? (
                                                        <div className="px-5 py-4 text-[12px] text-zinc-500">
                                                            Nenhum membro neste grupo.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-zinc-800/20">
                                                            {groupMembers.map((gm: any) => {
                                                                const u = gm.users;
                                                                return (
                                                                    <div key={gm.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/15 transition-colors">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0">
                                                                                {(u?.full_name || u?.email || "?").charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[12px] font-medium text-zinc-300">
                                                                                    {u?.full_name || u?.email || "Membro"}
                                                                                </p>
                                                                                {u?.email && u?.full_name && (
                                                                                    <p className="text-[10px] text-zinc-600">{u.email}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={() => handleRemoveMemberFromGroup(gm.id)}
                                                                                className="h-6 w-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                                                            >
                                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Add Member */}
                                                    {isAdmin && (
                                                        <div className="border-t border-zinc-800/30 px-5 py-3">
                                                            {!showAddMember ? (
                                                                <button
                                                                    onClick={() => setShowAddMember(true)}
                                                                    className="flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                                                >
                                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                                    </svg>
                                                                    Adicionar membro
                                                                </button>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <p className="text-[11px] text-zinc-500 font-medium">Selecione um membro:</p>
                                                                    {availableMembers.length === 0 ? (
                                                                        <p className="text-[11px] text-zinc-600">Todos os membros já estão neste grupo.</p>
                                                                    ) : (
                                                                        <div className="max-h-40 overflow-y-auto space-y-1 viewer-styled-scrollbar">
                                                                            {availableMembers.map(m => (
                                                                                <button
                                                                                    key={m.user_id}
                                                                                    onClick={() => handleAddMemberToGroup(m.user_id)}
                                                                                    disabled={addingMember}
                                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left disabled:opacity-50"
                                                                                >
                                                                                    <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                                                        {(m.name || "?").charAt(0).toUpperCase()}
                                                                                    </div>
                                                                                    <span className="text-[12px] text-zinc-300">{m.name || m.email || "Membro"}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setShowAddMember(false)}
                                                                        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                                                    >
                                                                        Fechar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
