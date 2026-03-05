"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getOrgMembers } from "@/lib/actions/organization";
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
            toast("Acesso atribuído", "success");
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

    const assignedGroupIds = assignments.filter(a => a.group_id).map(a => a.group_id);
    const assignedUserIds = assignments.filter(a => a.user_id).map(a => a.user_id);
    const availableGroups = groups.filter(g => !assignedGroupIds.includes(g.id));
    const availableMembers = members.filter(m => !assignedUserIds.includes(m.user_id));

    if (!isOpen) return null;

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
                                Todos os membros da organização podem visualizar esta {targetType === "proof" ? "prova" : "projeto"}.
                                <br />Ative o &ldquo;Acesso Restrito&rdquo; para limitar o acesso.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Current Assignments */}
                            {assignments.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-[12px] text-amber-400/80">
                                        Nenhum acesso atribuído. Apenas admins podem ver esta {targetType === "proof" ? "prova" : "projeto"}.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/30">
                                    {assignments.map((a: any) => (
                                        <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/15 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                {a.group_id ? (
                                                    <>
                                                        <div className="h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                            <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                            <div className="border-t border-zinc-800/40 p-4">
                                {!showPicker ? (
                                    <button
                                        onClick={() => setShowPicker(true)}
                                        className="flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Atribuir acesso
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Picker Tabs */}
                                        <div className="flex gap-1 p-0.5 bg-zinc-800/40 rounded-lg w-fit">
                                            <button
                                                onClick={() => setPickerTab("groups")}
                                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${pickerTab === "groups"
                                                    ? "bg-zinc-700 text-white"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                Grupos
                                            </button>
                                            <button
                                                onClick={() => setPickerTab("people")}
                                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${pickerTab === "people"
                                                    ? "bg-zinc-700 text-white"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                Pessoas
                                            </button>
                                        </div>

                                        <div className="max-h-36 overflow-y-auto space-y-0.5 viewer-styled-scrollbar">
                                            {pickerTab === "groups" ? (
                                                availableGroups.length === 0 ? (
                                                    <p className="text-[11px] text-zinc-600 py-2">Nenhum grupo disponível.</p>
                                                ) : (
                                                    availableGroups.map(g => (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => handleAssign({ groupId: g.id })}
                                                            disabled={assigning}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left disabled:opacity-50"
                                                        >
                                                            <div className="h-6 w-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                                <svg className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <span className="text-[12px] text-zinc-300 font-medium">{g.name}</span>
                                                                <span className="text-[10px] text-zinc-600 ml-1.5">
                                                                    {g.member_count} membro{g.member_count !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))
                                                )
                                            ) : (
                                                availableMembers.length === 0 ? (
                                                    <p className="text-[11px] text-zinc-600 py-2">Todos os membros já estão atribuídos.</p>
                                                ) : (
                                                    availableMembers.map(m => (
                                                        <button
                                                            key={m.user_id}
                                                            onClick={() => handleAssign({ userId: m.user_id })}
                                                            disabled={assigning}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left disabled:opacity-50"
                                                        >
                                                            <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                                {(m.name || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-[12px] text-zinc-300">{m.name || m.email || "Membro"}</span>
                                                        </button>
                                                    ))
                                                )
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setShowPicker(false)}
                                            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            Fechar
                                        </button>
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
