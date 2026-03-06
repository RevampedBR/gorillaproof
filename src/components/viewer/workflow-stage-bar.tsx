"use client";

import { useState } from "react";
import type { ProofWorkflowRow } from "@/lib/actions/workflows";

interface WorkflowStageBarProps {
    workflow: ProofWorkflowRow;
    onStageClick?: (stageIndex: number) => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    pending: { color: "#71717a", bg: "#27272a20", border: "#27272a", icon: "○" },
    active: { color: "#60a5fa", bg: "#60a5fa15", border: "#60a5fa40", icon: "●" },
    approved: { color: "#34d399", bg: "#34d39915", border: "#34d39940", icon: "✓" },
    rejected: { color: "#ef4444", bg: "#ef444415", border: "#ef444440", icon: "✕" },
    skipped: { color: "#a1a1aa", bg: "#a1a1aa10", border: "#a1a1aa30", icon: "⊘" },
};

export function WorkflowStageBar({ workflow, onStageClick }: WorkflowStageBarProps) {
    const [expandedStage, setExpandedStage] = useState<number | null>(null);
    const stages = workflow.workflow_stages;
    const totalStages = stages.length;

    if (totalStages === 0) return null;

    const activeStage = stages[workflow.current_stage_index];

    return (
        <div className="w-full bg-[#15152a] border-b border-[#2a2a40]">
            {/* Compact stage bar */}
            <div className="flex items-center gap-1 px-4 py-2">
                {/* Label */}
                <div className="flex items-center gap-2 mr-3 shrink-0">
                    <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Workflow</span>
                </div>

                {/* Stage steps */}
                <div className="flex items-center gap-0.5 flex-1 min-w-0">
                    {stages.map((stage, index) => {
                        const config = STATUS_CONFIG[stage.status] || STATUS_CONFIG.pending;
                        const isCurrent = index === workflow.current_stage_index && workflow.status === "active";

                        return (
                            <div key={stage.id} className="flex items-center min-w-0">
                                {/* Step dot + label */}
                                <button
                                    onClick={() => {
                                        setExpandedStage(expandedStage === index ? null : index);
                                        onStageClick?.(index);
                                    }}
                                    className={`
                                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold
                                        transition-all cursor-pointer whitespace-nowrap
                                        ${isCurrent
                                            ? `bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30`
                                            : `hover:bg-[#2a2a40]`
                                        }
                                    `}
                                    style={{
                                        color: isCurrent ? undefined : config.color,
                                    }}
                                >
                                    {/* Status icon */}
                                    <span className={`text-[11px] ${stage.status === "active" ? "animate-pulse" : ""}`}>
                                        {config.icon}
                                    </span>
                                    <span className="truncate max-w-[100px]">{stage.name}</span>
                                    {/* Decision count */}
                                    {stage.stage_decisions && stage.stage_decisions.length > 0 && (
                                        <span
                                            className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
                                            style={{ background: config.bg, color: config.color }}
                                        >
                                            {stage.stage_decisions.length}
                                        </span>
                                    )}
                                </button>

                                {/* Connector line */}
                                {index < totalStages - 1 && (
                                    <div
                                        className="w-4 h-px mx-0.5 shrink-0"
                                        style={{
                                            background: stages[index].status === "approved" || stages[index].status === "skipped"
                                                ? "#34d39960"
                                                : "#3a3a55",
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Workflow status badge */}
                <div className="flex items-center gap-2 ml-3 shrink-0">
                    {workflow.status === "active" && activeStage && (
                        <span className="text-[9px] font-mono text-zinc-500">
                            {workflow.current_stage_index + 1}/{totalStages}
                        </span>
                    )}
                    {workflow.status === "completed" && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            ✓ Concluído
                        </span>
                    )}
                    {workflow.status === "cancelled" && (
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-md">
                            Cancelado
                        </span>
                    )}
                </div>
            </div>

            {/* Expanded stage detail */}
            {expandedStage !== null && stages[expandedStage] && (
                <div className="px-4 pb-3 border-t border-[#2a2a40]">
                    <StageDetail stage={stages[expandedStage]} />
                </div>
            )}
        </div>
    );
}

function StageDetail({ stage }: { stage: ProofWorkflowRow["workflow_stages"][0] }) {
    const config = STATUS_CONFIG[stage.status] || STATUS_CONFIG.pending;

    return (
        <div className="pt-3">
            {/* Stage header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold" style={{ color: config.color }}>
                        {stage.name}
                    </span>
                    <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                    >
                        {stage.status === "active" ? "Em andamento"
                            : stage.status === "approved" ? "Aprovado"
                                : stage.status === "rejected" ? "Rejeitado"
                                    : stage.status === "skipped" ? "Pulado"
                                        : "Pendente"}
                    </span>
                </div>
                {stage.deadline && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                        Prazo: {new Date(stage.deadline).toLocaleDateString("pt-BR")}
                    </span>
                )}
            </div>

            {stage.description && (
                <p className="text-[11px] text-zinc-500 mb-2">{stage.description}</p>
            )}

            {/* Reviewers */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider self-center mr-1">
                    Revisores:
                </span>
                {stage.stage_reviewers.map((r) => (
                    <span
                        key={r.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#2a2a40] text-zinc-400 flex items-center gap-1"
                    >
                        {r.users ? (
                            <>
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                                {r.users.full_name || r.users.email}
                            </>
                        ) : r.contact_groups ? (
                            <>
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 inline-block" />
                                {r.contact_groups.name}
                            </>
                        ) : null}
                        {/* Decision indicator */}
                        {r.users && stage.stage_decisions.find(d => d.user_id === r.users?.id) && (
                            <DecisionBadge decision={stage.stage_decisions.find(d => d.user_id === r.users?.id)!.decision} />
                        )}
                    </span>
                ))}
            </div>

            {/* Decisions list */}
            {stage.stage_decisions.length > 0 && (
                <div className="space-y-1">
                    {stage.stage_decisions.map((d) => {
                        const decConfig = DECISION_LABELS[d.decision] || { label: d.decision, color: "#71717a" };
                        return (
                            <div key={d.id} className="flex items-center gap-2 text-[10px]">
                                <span className="text-zinc-500">{d.users?.full_name || "Usuário"}</span>
                                <span style={{ color: decConfig.color }} className="font-semibold">{decConfig.label}</span>
                                {d.comment && (
                                    <span className="text-zinc-600 truncate max-w-[200px]">— {d.comment}</span>
                                )}
                                <span className="text-zinc-700 font-mono ml-auto">
                                    {new Date(d.decided_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Threshold info */}
            {stage.approval_threshold > 0 && (
                <p className="text-[9px] text-zinc-600 mt-2">
                    Necessário: {stage.approval_threshold} aprovação(ões) para avançar
                </p>
            )}
        </div>
    );
}

function DecisionBadge({ decision }: { decision: string }) {
    const config = DECISION_LABELS[decision];
    if (!config) return null;

    return (
        <span
            className="text-[8px] font-bold px-1 rounded"
            style={{ color: config.color, background: config.color + "15" }}
        >
            {config.icon}
        </span>
    );
}

const DECISION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    approved: { label: "Aprovado", color: "#34d399", icon: "✓" },
    approved_with_changes: { label: "Aprovado c/ alterações", color: "#fbbf24", icon: "✓~" },
    changes_requested: { label: "Alterações solicitadas", color: "#f97316", icon: "↻" },
    rejected: { label: "Rejeitado", color: "#ef4444", icon: "✕" },
};
