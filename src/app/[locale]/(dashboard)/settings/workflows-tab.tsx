"use client";

import { useState, useEffect } from "react";
import {
    getWorkflowTemplates,
    createWorkflowTemplate,
    updateWorkflowTemplate,
    deleteWorkflowTemplate,
    type WorkflowTemplateRow,
    type WorkflowStageInput,
} from "@/lib/actions/workflows";
import { getOrgMembers } from "@/lib/actions/organization";
import { useToast } from "@/components/ui/toast-provider";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, X, Layers, Edit2, Users, Clock } from "lucide-react";

// ─── Types ───

interface OrgMember {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

interface StageForm {
    name: string;
    description: string;
    reviewers: { type: "user" | "group"; id: string; label: string }[];
    approval_threshold: number;
    deadline_days: number;
}

const EMPTY_STAGE: StageForm = { name: "", description: "", reviewers: [], approval_threshold: 0, deadline_days: 0 };

// ─── Component ───

export function WorkflowsTab({ orgId }: { orgId: string }) {
    const [templates, setTemplates] = useState<WorkflowTemplateRow[]>([]);
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formStages, setFormStages] = useState<StageForm[]>([{ ...EMPTY_STAGE, name: "Revisão" }]);

    const toast = useToast();

    // Load data
    useEffect(() => {
        Promise.all([
            getWorkflowTemplates(orgId),
            getOrgMembers(orgId),
        ]).then(([tRes, mRes]) => {
            if (tRes.data) setTemplates(tRes.data);
            if (mRes.data) setMembers(mRes.data.map((m: any) => ({
                id: m.user_id,
                full_name: m.users?.full_name || m.users?.email || "—",
                email: m.users?.email || "",
                role: m.role,
            })));
            setLoading(false);
        });
    }, [orgId]);

    // Reset form
    const resetForm = () => {
        setFormName("");
        setFormDesc("");
        setFormStages([{ ...EMPTY_STAGE, name: "Revisão" }]);
        setEditingId(null);
        setCreating(false);
    };

    // Open create
    const startCreate = () => {
        resetForm();
        setCreating(true);
    };

    // Open edit
    const startEdit = (t: WorkflowTemplateRow) => {
        setCreating(false);
        setEditingId(t.id);
        setFormName(t.name);
        setFormDesc(t.description || "");
        const stagesArr = (t.stages as any[]) || [];
        setFormStages(stagesArr.map((s: any) => ({
            name: s.name || "",
            description: s.description || "",
            reviewers: (s.reviewers || []).map((r: any) => ({
                type: r.type,
                id: r.id,
                label: r.type === "user"
                    ? members.find(m => m.id === r.id)?.full_name || r.id
                    : r.id,
            })),
            approval_threshold: s.approval_threshold || 0,
            deadline_days: s.deadline_days || 0,
        })));
    };

    // Save (create or update)
    const handleSave = async () => {
        if (!formName.trim()) { toast.toast("Nome é obrigatório", "error"); return; }
        if (formStages.length === 0) { toast.toast("Pelo menos uma etapa é necessária", "error"); return; }
        for (let i = 0; i < formStages.length; i++) {
            if (!formStages[i].name.trim()) {
                toast.toast(`Etapa ${i + 1}: nome é obrigatório`, "error");
                return;
            }
        }

        setSaving(true);
        const stageInputs: WorkflowStageInput[] = formStages.map(s => ({
            name: s.name.trim(),
            description: s.description.trim() || undefined,
            reviewers: s.reviewers.map(r => ({ type: r.type, id: r.id })),
            approval_threshold: s.approval_threshold,
            deadline_days: s.deadline_days > 0 ? s.deadline_days : undefined,
        }));

        if (editingId) {
            const res = await updateWorkflowTemplate(editingId, formName.trim(), formDesc.trim() || null, stageInputs);
            if (res.error) { toast.toast(res.error, "error"); setSaving(false); return; }
            toast.toast("Template atualizado", "success");
        } else {
            const res = await createWorkflowTemplate(orgId, formName.trim(), formDesc.trim() || null, stageInputs);
            if (res.error) { toast.toast(res.error, "error"); setSaving(false); return; }
            toast.toast("Template criado", "success");
        }

        // Reload
        const { data } = await getWorkflowTemplates(orgId);
        if (data) setTemplates(data);
        resetForm();
        setSaving(false);
    };

    // Delete
    const handleDelete = async (id: string) => {
        const res = await deleteWorkflowTemplate(id);
        if (res.error) { toast.toast(res.error, "error"); return; }
        setTemplates(templates.filter(t => t.id !== id));
        setConfirmDelete(null);
        toast.toast("Template removido", "success");
        if (editingId === id) resetForm();
    };

    // Stage helpers
    const addStage = () => setFormStages([...formStages, { ...EMPTY_STAGE }]);
    const removeStage = (i: number) => { if (formStages.length > 1) setFormStages(formStages.filter((_, idx) => idx !== i)); };
    const updateStage = (i: number, u: Partial<StageForm>) => setFormStages(formStages.map((s, idx) => idx === i ? { ...s, ...u } : s));
    const addReviewer = (si: number, id: string, label: string) => {
        const stage = formStages[si];
        if (stage.reviewers.some(r => r.id === id)) return;
        updateStage(si, { reviewers: [...stage.reviewers, { type: "user", id, label }] });
    };
    const removeReviewer = (si: number, ri: number) => {
        updateStage(si, { reviewers: formStages[si].reviewers.filter((_, i) => i !== ri) });
    };

    // Render
    const isEditing = creating || editingId !== null;

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-6 w-6 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[16px] font-bold text-white">Templates de Workflow</h2>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                        Crie modelos reutilizáveis para suas etapas de revisão
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={startCreate}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Novo Template
                    </button>
                )}
            </div>

            {/* Template List */}
            {!isEditing && templates.length === 0 && (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
                    <Layers className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-[13px] text-zinc-500">Nenhum template criado ainda</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                        Templates permitem reutilizar fluxos de revisão em novas provas
                    </p>
                    <button
                        onClick={startCreate}
                        className="mt-4 px-4 py-2 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer"
                    >
                        Criar primeiro template
                    </button>
                </div>
            )}

            {!isEditing && templates.length > 0 && (
                <div className="space-y-2">
                    {templates.map(t => {
                        const stagesArr = (t.stages as any[]) || [];
                        return (
                            <div key={t.id} className="border border-zinc-800/60 rounded-xl bg-zinc-900/30 p-4 flex items-center gap-4 group hover:border-zinc-700/60 transition-all">
                                <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                                    <Layers className="h-4.5 w-4.5 text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-zinc-200 truncate">{t.name}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <Layers className="h-3 w-3" />
                                            {stagesArr.length} etapa{stagesArr.length !== 1 ? "s" : ""}
                                        </span>
                                        {t.description && (
                                            <span className="text-[10px] text-zinc-600 truncate max-w-[200px]">{t.description}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(t)}
                                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
                                        title="Editar"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    {confirmDelete === t.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="px-2 py-1 rounded text-[9px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                                            >
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(null)}
                                                className="px-2 py-1 rounded text-[9px] font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(t.id)}
                                            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                            title="Remover"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Form */}
            {isEditing && (
                <div className="border border-zinc-800/60 rounded-xl bg-zinc-900/30 overflow-hidden">
                    {/* Form header */}
                    <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between">
                        <h3 className="text-[14px] font-bold text-white">
                            {editingId ? "Editar Template" : "Novo Template"}
                        </h3>
                        <button onClick={resetForm} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Name + Description */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="Ex: Fluxo Padrão Marketing"
                                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 px-3 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Descrição</label>
                                <input
                                    type="text"
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    placeholder="Descrição opcional"
                                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg text-[12px] text-zinc-400 px-3 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                        </div>

                        {/* Stages */}
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                                Etapas ({formStages.length})
                            </label>
                            <div className="space-y-2">
                                {formStages.map((stage, i) => (
                                    <div key={i} className="border border-zinc-800/40 rounded-xl bg-zinc-950/50 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950/80">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase">Etapa {i + 1}</span>
                                            <div className="flex-1" />
                                            {formStages.length > 1 && (
                                                <button onClick={() => removeStage(i)} className="text-[9px] text-red-500/50 hover:text-red-400 cursor-pointer">
                                                    remover
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2.5">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Nome da etapa"
                                                    value={stage.name}
                                                    onChange={e => updateStage(i, { name: e.target.value })}
                                                    className="h-8 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 px-3 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Descrição (opcional)"
                                                    value={stage.description}
                                                    onChange={e => updateStage(i, { description: e.target.value })}
                                                    className="h-8 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-400 px-3 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                                                />
                                            </div>

                                            {/* Reviewers */}
                                            <div>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {stage.reviewers.map((r, ri) => (
                                                        <span key={ri} className="text-[9px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 flex items-center gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                            {r.label}
                                                            <button onClick={() => removeReviewer(i, ri)} className="text-zinc-600 hover:text-red-400 ml-0.5 cursor-pointer">×</button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <select
                                                    className="w-full h-7 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 px-2 focus:outline-none"
                                                    onChange={e => {
                                                        if (!e.target.value) return;
                                                        const m = members.find(m => m.id === e.target.value);
                                                        if (m) addReviewer(i, m.id, m.full_name || m.email);
                                                        e.target.value = "";
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="">+ Adicionar revisor...</option>
                                                    {members
                                                        .filter(m => !stage.reviewers.some(r => r.id === m.id))
                                                        .map(m => (
                                                            <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Threshold + Deadline */}
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-[8px] text-zinc-600 block mb-0.5">Aprovações (0 = todos)</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={stage.approval_threshold}
                                                        onChange={e => updateStage(i, { approval_threshold: parseInt(e.target.value) || 0 })}
                                                        className="w-full h-7 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 px-2 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[8px] text-zinc-600 block mb-0.5">Prazo (dias, 0 = sem)</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={stage.deadline_days}
                                                        onChange={e => updateStage(i, { deadline_days: parseInt(e.target.value) || 0 })}
                                                        className="w-full h-7 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 px-2 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addStage}
                                    className="w-full h-9 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-600 text-[10px] font-semibold hover:border-emerald-500/30 hover:text-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Adicionar etapa
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Form footer */}
                    <div className="px-5 py-3 border-t border-zinc-800/40 flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 h-9 rounded-lg text-[11px] font-bold bg-emerald-500 text-[#0d1a14] hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {saving ? "Salvando..." : editingId ? "Atualizar Template" : "Criar Template"}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 h-9 rounded-lg text-[11px] font-bold text-zinc-400 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
