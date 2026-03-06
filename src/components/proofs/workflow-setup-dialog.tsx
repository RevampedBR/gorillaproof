"use client";

import { useState, useEffect } from "react";
import {
    getWorkflowTemplates,
    startWorkflow,
    cancelWorkflow,
    advanceStage,
    restartStage,
    createWorkflowTemplate,
    type WorkflowStageInput,
    type WorkflowTemplateRow,
    type ProofWorkflowRow,
} from "@/lib/actions/workflows";
import { Save } from "lucide-react";

interface WorkflowSetupDialogProps {
    proofId: string;
    orgId: string;
    orgMembers: { id: string; full_name: string; email: string; role: string }[];
    contactGroups?: { id: string; name: string }[];
    existingWorkflow?: ProofWorkflowRow | null;
    onClose: () => void;
    onWorkflowChange: () => void;
}

interface StageFormData {
    name: string;
    description: string;
    reviewers: { type: "user" | "group"; id: string; label: string }[];
    approval_threshold: number;
    deadline_days: number;
}

const EMPTY_STAGE: StageFormData = {
    name: "",
    description: "",
    reviewers: [],
    approval_threshold: 0,
    deadline_days: 0,
};

export function WorkflowSetupDialog({
    proofId,
    orgId,
    orgMembers,
    contactGroups = [],
    existingWorkflow,
    onClose,
    onWorkflowChange,
}: WorkflowSetupDialogProps) {
    const [mode, setMode] = useState<"template" | "custom">("custom");
    const [templates, setTemplates] = useState<WorkflowTemplateRow[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [stages, setStages] = useState<StageFormData[]>([{ ...EMPTY_STAGE, name: "Revisão" }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");

    // Load templates
    useEffect(() => {
        getWorkflowTemplates(orgId).then((res) => {
            if (res.data) setTemplates(res.data);
        });
    }, [orgId]);

    // When template is selected, populate stages
    useEffect(() => {
        if (selectedTemplateId) {
            const template = templates.find((t) => t.id === selectedTemplateId);
            if (template?.stages) {
                setStages(
                    template.stages.map((s) => ({
                        name: s.name,
                        description: s.description || "",
                        reviewers: s.reviewers.map((r) => ({
                            type: r.type,
                            id: r.id,
                            label: r.type === "user"
                                ? orgMembers.find((m) => m.id === r.id)?.full_name || r.id
                                : contactGroups.find((g) => g.id === r.id)?.name || r.id,
                        })),
                        approval_threshold: s.approval_threshold,
                        deadline_days: s.deadline_days || 0,
                    }))
                );
            }
        }
    }, [selectedTemplateId, templates, orgMembers, contactGroups]);

    const addStage = () => setStages([...stages, { ...EMPTY_STAGE }]);

    const removeStage = (index: number) => {
        if (stages.length <= 1) return;
        setStages(stages.filter((_, i) => i !== index));
    };

    const updateStage = (index: number, updates: Partial<StageFormData>) => {
        setStages(stages.map((s, i) => (i === index ? { ...s, ...updates } : s)));
    };

    const addReviewer = (stageIndex: number, type: "user" | "group", id: string, label: string) => {
        const stage = stages[stageIndex];
        if (stage.reviewers.some((r) => r.type === type && r.id === id)) return;
        updateStage(stageIndex, {
            reviewers: [...stage.reviewers, { type, id, label }],
        });
    };

    const removeReviewer = (stageIndex: number, reviewerIndex: number) => {
        const stage = stages[stageIndex];
        updateStage(stageIndex, {
            reviewers: stage.reviewers.filter((_, i) => i !== reviewerIndex),
        });
    };

    const handleStart = async () => {
        // Validate
        for (let i = 0; i < stages.length; i++) {
            if (!stages[i].name.trim()) {
                setError(`Etapa ${i + 1}: nome é obrigatório`);
                return;
            }
            if (stages[i].reviewers.length === 0) {
                setError(`Etapa ${i + 1}: pelo menos um revisor é necessário`);
                return;
            }
        }

        if (saveAsTemplate && !templateName.trim()) {
            setError("Nome do template é obrigatório quando 'Salvar como template' está ativo");
            return;
        }

        setLoading(true);
        setError(null);

        const stageInputs: WorkflowStageInput[] = stages.map((s) => ({
            name: s.name.trim(),
            description: s.description.trim() || undefined,
            reviewers: s.reviewers.map((r) => ({ type: r.type, id: r.id })),
            approval_threshold: s.approval_threshold,
            deadline_days: s.deadline_days > 0 ? s.deadline_days : undefined,
        }));

        // Save as template first
        let newTemplateId: string | null = null;
        if (saveAsTemplate && templateName.trim()) {
            const tmplRes = await createWorkflowTemplate(orgId, templateName.trim(), null, stageInputs);
            if (tmplRes.data) newTemplateId = tmplRes.data.id;
        }

        const result = await startWorkflow(proofId, stageInputs, newTemplateId || selectedTemplateId);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        onWorkflowChange();
        onClose();
    };

    const handleCancel = async () => {
        if (!existingWorkflow) return;
        setLoading(true);
        await cancelWorkflow(existingWorkflow.id);
        onWorkflowChange();
        onClose();
    };

    const handleAdvance = async () => {
        if (!existingWorkflow) return;
        setLoading(true);
        await advanceStage(existingWorkflow.id);
        onWorkflowChange();
        onClose();
    };

    const handleRestart = async (stageId: string) => {
        setLoading(true);
        await restartStage(stageId);
        onWorkflowChange();
        onClose();
    };

    // If there's an existing active workflow, show management mode
    if (existingWorkflow?.status === "active") {
        const currentStage = existingWorkflow.workflow_stages[existingWorkflow.current_stage_index];
        const isRejected = currentStage?.status === "rejected";

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-[#1a1a2e] border border-[#2a2a40] rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="p-5 border-b border-[#2a2a40]">
                        <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
                            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                            </svg>
                            Gerenciar Workflow
                        </h2>
                        <p className="text-[11px] text-zinc-500 mt-1">
                            Etapa {existingWorkflow.current_stage_index + 1} de {existingWorkflow.workflow_stages.length}
                            {currentStage && ` — ${currentStage.name}`}
                        </p>
                    </div>

                    <div className="p-5 space-y-3">
                        {/* Stage list */}
                        {existingWorkflow.workflow_stages.map((stage, i) => (
                            <div
                                key={stage.id}
                                className={`p-3 rounded-xl border ${i === existingWorkflow.current_stage_index
                                    ? "border-blue-500/30 bg-blue-500/5"
                                    : stage.status === "approved" ? "border-emerald-500/20 bg-emerald-500/5"
                                        : stage.status === "rejected" ? "border-red-500/20 bg-red-500/5"
                                            : "border-[#2a2a40] bg-[#15152a]"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-zinc-300">{i + 1}. {stage.name}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${stage.status === "active" ? "text-blue-400 bg-blue-500/15"
                                        : stage.status === "approved" ? "text-emerald-400 bg-emerald-500/15"
                                            : stage.status === "rejected" ? "text-red-400 bg-red-500/15"
                                                : stage.status === "skipped" ? "text-zinc-400 bg-zinc-500/15"
                                                    : "text-zinc-500 bg-zinc-500/10"
                                        }`}>
                                        {stage.status === "active" ? "Ativo" : stage.status === "approved" ? "Aprovado" : stage.status === "rejected" ? "Rejeitado" : stage.status === "skipped" ? "Pulado" : "Pendente"}
                                    </span>
                                </div>
                                {stage.stage_decisions.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {stage.stage_decisions.map((d) => (
                                            <div key={d.id} className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                <span>{d.users?.full_name || "?"}</span>
                                                <span className={
                                                    d.decision === "approved" ? "text-emerald-400"
                                                        : d.decision === "rejected" ? "text-red-400"
                                                            : "text-amber-400"
                                                }>
                                                    {d.decision === "approved" ? "✓" : d.decision === "rejected" ? "✕" : "~"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Restart rejected stage */}
                                {stage.status === "rejected" && (
                                    <button
                                        onClick={() => handleRestart(stage.id)}
                                        disabled={loading}
                                        className="mt-2 text-[10px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                                    >
                                        ↻ Reiniciar etapa
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-5 border-t border-[#2a2a40] flex gap-2">
                        {!isRejected && (
                            <button
                                onClick={handleAdvance}
                                disabled={loading}
                                className="flex-1 h-9 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                            >
                                Pular etapa →
                            </button>
                        )}
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex-1 h-9 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                            Cancelar Workflow
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 h-9 rounded-lg text-[11px] font-bold text-zinc-400 hover:text-zinc-300 cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Setup mode — create new workflow
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1a2e] border border-[#2a2a40] rounded-2xl shadow-2xl w-[600px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-[#2a2a40]">
                    <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                        Iniciar Workflow
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-1">
                        Configure etapas sequenciais de revisão para este proof
                    </p>
                </div>

                {/* Mode selector */}
                {templates.length > 0 && (
                    <div className="px-5 pt-4 flex gap-2">
                        <button
                            onClick={() => { setMode("custom"); setSelectedTemplateId(null); }}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${mode === "custom" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 hover:text-zinc-300 border border-[#2a2a40]"}`}
                        >
                            Personalizado
                        </button>
                        <button
                            onClick={() => setMode("template")}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${mode === "template" ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300 border border-[#2a2a40]"}`}
                        >
                            Usar Template ({templates.length})
                        </button>
                    </div>
                )}

                {/* Template selector */}
                {mode === "template" && (
                    <div className="px-5 pt-3">
                        <select
                            value={selectedTemplateId || ""}
                            onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                            className="w-full h-9 bg-[#15152a] border border-[#2a2a40] rounded-lg text-[12px] text-zinc-300 px-3 focus:outline-none focus:border-violet-500/50"
                        >
                            <option value="">Selecione um template...</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({(t.stages as any[]).length} etapas)</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Stages */}
                <div className="p-5 space-y-3">
                    {stages.map((stage, index) => (
                        <div key={index} className="border border-[#2a2a40] rounded-xl bg-[#15152a] overflow-hidden">
                            {/* Stage header */}
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12122a]">
                                <span className="text-[10px] font-bold text-zinc-500">ETAPA {index + 1}</span>
                                <div className="flex-1" />
                                {stages.length > 1 && (
                                    <button onClick={() => removeStage(index)} className="text-red-500/50 hover:text-red-400 text-[10px] cursor-pointer">
                                        remover
                                    </button>
                                )}
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Name */}
                                <input
                                    type="text"
                                    placeholder="Nome da etapa (ex: Revisão de Design)"
                                    value={stage.name}
                                    onChange={(e) => updateStage(index, { name: e.target.value })}
                                    className="w-full h-9 bg-[#1a1a2e] border border-[#2a2a40] rounded-lg text-[12px] text-zinc-300 px-3 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                />

                                {/* Description (optional) */}
                                <input
                                    type="text"
                                    placeholder="Descrição (opcional)"
                                    value={stage.description}
                                    onChange={(e) => updateStage(index, { description: e.target.value })}
                                    className="w-full h-8 bg-[#1a1a2e] border border-[#2a2a40] rounded-lg text-[11px] text-zinc-400 px-3 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                                />

                                {/* Reviewers */}
                                <div>
                                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1.5">
                                        Revisores
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {stage.reviewers.map((r, ri) => (
                                            <span key={ri} className="text-[10px] px-2 py-1 rounded-md bg-[#2a2a40] text-zinc-300 flex items-center gap-1.5">
                                                <span className={`h-1.5 w-1.5 rounded-full ${r.type === "user" ? "bg-blue-400" : "bg-violet-400"}`} />
                                                {r.label}
                                                <button
                                                    onClick={() => removeReviewer(index, ri)}
                                                    className="text-zinc-600 hover:text-red-400 ml-0.5 cursor-pointer"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {/* Add reviewer */}
                                    <div className="flex gap-1.5">
                                        <select
                                            className="flex-1 h-8 bg-[#1a1a2e] border border-[#2a2a40] rounded-lg text-[10px] text-zinc-400 px-2 focus:outline-none"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) return;
                                                const [type, id] = val.split("::");
                                                const label = type === "user"
                                                    ? orgMembers.find((m) => m.id === id)?.full_name || id
                                                    : contactGroups.find((g) => g.id === id)?.name || id;
                                                addReviewer(index, type as "user" | "group", id, label);
                                                e.target.value = "";
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="">+ Adicionar revisor...</option>
                                            {orgMembers.length > 0 && (
                                                <optgroup label="Membros">
                                                    {orgMembers
                                                        .filter((m) => !stage.reviewers.some((r) => r.type === "user" && r.id === m.id))
                                                        .map((m) => (
                                                            <option key={m.id} value={`user::${m.id}`}>
                                                                {m.full_name || m.email}
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            )}
                                            {contactGroups.length > 0 && (
                                                <optgroup label="Grupos">
                                                    {contactGroups
                                                        .filter((g) => !stage.reviewers.some((r) => r.type === "group" && r.id === g.id))
                                                        .map((g) => (
                                                            <option key={g.id} value={`group::${g.id}`}>
                                                                {g.name}
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* Threshold + Deadline */}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                                            Aprovações necessárias
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={stage.approval_threshold}
                                            onChange={(e) => updateStage(index, { approval_threshold: parseInt(e.target.value) || 0 })}
                                            className="w-full h-8 bg-[#1a1a2e] border border-[#2a2a40] rounded-lg text-[11px] text-zinc-300 px-3 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <p className="text-[8px] text-zinc-700 mt-0.5">0 = todos devem aprovar</p>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                                            Prazo (dias)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={stage.deadline_days}
                                            onChange={(e) => updateStage(index, { deadline_days: parseInt(e.target.value) || 0 })}
                                            className="w-full h-8 bg-[#1a1a2e] border border-[#2a2a40] rounded-lg text-[11px] text-zinc-300 px-3 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <p className="text-[8px] text-zinc-700 mt-0.5">0 = sem prazo</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add stage button */}
                    <button
                        onClick={addStage}
                        className="w-full h-10 rounded-xl border-2 border-dashed border-[#2a2a40] text-zinc-500 text-[11px] font-semibold hover:border-emerald-500/30 hover:text-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span className="text-[14px]">+</span> Adicionar etapa
                    </button>
                </div>

                {/* Save as template */}
                {mode === "custom" && (
                    <div className="mx-5 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={saveAsTemplate}
                                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                            />
                            <Save className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Salvar como template para uso futuro</span>
                        </label>
                        {saveAsTemplate && (
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Nome do template (ex: Fluxo Padrão)"
                                className="mt-2 w-full h-8 bg-[#15152a] border border-[#2a2a40] rounded-lg text-[11px] text-zinc-300 px-3 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                            />
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-5 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="p-5 border-t border-[#2a2a40] flex gap-2">
                    <button
                        onClick={handleStart}
                        disabled={loading || stages.length === 0}
                        className="flex-1 h-10 rounded-xl text-[12px] font-bold bg-emerald-500 text-[#0d1a14] hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Iniciando..." : `Iniciar Workflow (${stages.length} etapa${stages.length > 1 ? "s" : ""})`}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 h-10 rounded-xl text-[12px] font-bold text-zinc-400 hover:text-zinc-300 border border-[#2a2a40] hover:border-[#3a3a55] cursor-pointer"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
