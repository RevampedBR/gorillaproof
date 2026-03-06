"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/actions/activity";
import { notifyStageStart, notifyStageComplete, notifyWorkflowComplete } from "@/lib/actions/email";

// ─── Types ───

export interface WorkflowStageInput {
    name: string;
    description?: string;
    reviewers: { type: "user" | "group"; id: string }[];
    approval_threshold: number; // 0 = all must approve
    deadline_days?: number;
}

export interface WorkflowTemplateRow {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    stages: WorkflowStageInput[];
    created_by: string | null;
    created_at: string;
}

export interface StageDecisionRow {
    id: string;
    stage_id: string;
    user_id: string;
    decision: string;
    comment: string | null;
    decided_at: string;
    users?: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
}

export interface WorkflowStageRow {
    id: string;
    workflow_id: string;
    stage_index: number;
    name: string;
    description: string | null;
    deadline: string | null;
    approval_threshold: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    stage_reviewers: {
        id: string;
        user_id: string | null;
        group_id: string | null;
        users?: { id: string; full_name: string; email: string } | null;
        contact_groups?: { id: string; name: string } | null;
    }[];
    stage_decisions: StageDecisionRow[];
}

export interface ProofWorkflowRow {
    id: string;
    proof_id: string;
    template_id: string | null;
    current_stage_index: number;
    status: string;
    started_at: string;
    completed_at: string | null;
    started_by: string | null;
    workflow_stages: WorkflowStageRow[];
}

// ─── Template CRUD ───

export async function getWorkflowTemplates(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    const { data, error } = await supabase
        .from("workflow_templates")
        .select("id, organization_id, name, description, stages, created_by, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    return { data: (data ?? []) as WorkflowTemplateRow[], error: error?.message ?? null };
}

export async function createWorkflowTemplate(
    orgId: string,
    name: string,
    description: string | null,
    stages: WorkflowStageInput[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    if (!name.trim()) return { error: "Nome é obrigatório", data: null };
    if (stages.length === 0) return { error: "Pelo menos uma etapa é necessária", data: null };

    const { data, error } = await supabase
        .from("workflow_templates")
        .insert({
            organization_id: orgId,
            name: name.trim(),
            description: description?.trim() || null,
            stages: stages as unknown as Record<string, unknown>[],
            created_by: user.id,
        })
        .select("id")
        .single();

    if (error) return { error: error.message, data: null };
    return { error: null, data };
}

export async function updateWorkflowTemplate(
    templateId: string,
    name: string,
    description: string | null,
    stages: WorkflowStageInput[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
        .from("workflow_templates")
        .update({
            name: name.trim(),
            description: description?.trim() || null,
            stages: stages as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

    return { error: error?.message ?? null };
}

export async function deleteWorkflowTemplate(templateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase.from("workflow_templates").delete().eq("id", templateId);
    return { error: error?.message ?? null };
}

// ─── Workflow Lifecycle ───

export async function startWorkflow(
    proofId: string,
    stages: WorkflowStageInput[],
    templateId?: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    if (stages.length === 0) return { error: "Pelo menos uma etapa é necessária", data: null };

    // Check if proof already has a workflow
    const { data: existing } = await supabaseAdmin
        .from("proof_workflows")
        .select("id, status")
        .eq("proof_id", proofId)
        .single();

    if (existing?.status === "active") {
        return { error: "Proof já possui um workflow ativo", data: null };
    }

    // If there's a completed/cancelled workflow, delete it first
    if (existing) {
        await supabaseAdmin.from("proof_workflows").delete().eq("id", existing.id);
    }

    // Create the workflow
    const { data: workflow, error: wfError } = await supabaseAdmin
        .from("proof_workflows")
        .insert({
            proof_id: proofId,
            template_id: templateId || null,
            current_stage_index: 0,
            status: "active",
            started_by: user.id,
        })
        .select("id")
        .single();

    if (wfError || !workflow) return { error: wfError?.message || "Erro ao criar workflow", data: null };

    // Create stages
    for (let i = 0; i < stages.length; i++) {
        const stageInput = stages[i];
        const isFirstStage = i === 0;

        const deadlineDate = stageInput.deadline_days
            ? new Date(Date.now() + stageInput.deadline_days * 86400000).toISOString()
            : null;

        const { data: stage, error: stageError } = await supabaseAdmin
            .from("workflow_stages")
            .insert({
                workflow_id: workflow.id,
                stage_index: i,
                name: stageInput.name,
                description: stageInput.description || null,
                deadline: deadlineDate,
                approval_threshold: stageInput.approval_threshold,
                status: isFirstStage ? "active" : "pending",
                started_at: isFirstStage ? new Date().toISOString() : null,
            })
            .select("id")
            .single();

        if (stageError || !stage) {
            // Rollback: delete the workflow
            await supabaseAdmin.from("proof_workflows").delete().eq("id", workflow.id);
            return { error: `Erro ao criar etapa ${i + 1}: ${stageError?.message}`, data: null };
        }

        // Create stage reviewers
        for (const reviewer of stageInput.reviewers) {
            await supabaseAdmin.from("stage_reviewers").insert({
                stage_id: stage.id,
                user_id: reviewer.type === "user" ? reviewer.id : null,
                group_id: reviewer.type === "group" ? reviewer.id : null,
            });
        }
    }

    // Update proof status to in_review
    await supabaseAdmin.from("proofs").update({ status: "in_review" }).eq("id", proofId);

    await logActivity({
        proofId,
        action: "workflow_started",
        metadata: { stages: stages.length, template_id: templateId },
    });

    // Notify first stage reviewers
    const { data: firstStage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id, name, description, deadline")
        .eq("workflow_id", workflow.id)
        .eq("stage_index", 0)
        .single();

    if (firstStage) {
        const recipients = await getReviewerRecipients(firstStage.id);
        const ctx = await getProofContext(proofId);
        if (recipients.length > 0) {
            notifyStageStart({
                proofTitle: ctx.title,
                proofUrl: ctx.url,
                stageName: firstStage.name,
                stageIndex: 0,
                totalStages: stages.length,
                stageDescription: firstStage.description || undefined,
                deadline: firstStage.deadline || undefined,
                recipients,
                orgId: ctx.orgId,
            }).catch(() => { }); // non-blocking
        }
    }

    revalidatePath(`/proofs/${proofId}`);
    return { error: null, data: { workflowId: workflow.id } };
}

export async function getProofWorkflow(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    const { data, error } = await supabase
        .from("proof_workflows")
        .select(`
            id, proof_id, template_id, current_stage_index, status,
            started_at, completed_at, started_by,
            workflow_stages (
                id, workflow_id, stage_index, name, description, deadline,
                approval_threshold, status, started_at, completed_at,
                stage_reviewers (
                    id, user_id, group_id,
                    users ( id, full_name, email ),
                    contact_groups ( id, name )
                ),
                stage_decisions (
                    id, stage_id, user_id, decision, comment, decided_at,
                    users ( id, full_name, avatar_url, email )
                )
            )
        `)
        .eq("proof_id", proofId)
        .single();

    if (error && error.code !== "PGRST116") {
        return { data: null, error: error.message };
    }

    // Sort stages by index
    if (data?.workflow_stages) {
        data.workflow_stages.sort((a: any, b: any) => a.stage_index - b.stage_index);
    }

    return { data: data as ProofWorkflowRow | null, error: null };
}

// ─── Stage Decisions ───

export async function submitStageDecision(
    stageId: string,
    decision: string,
    comment?: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Verify stage is active
    const { data: stage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id, status, workflow_id, name, stage_index")
        .eq("id", stageId)
        .single();

    if (!stage) return { error: "Etapa não encontrada" };
    if (stage.status !== "active") return { error: "Esta etapa não está ativa" };

    // Get workflow to check proof lock
    const { data: workflow } = await supabaseAdmin
        .from("proof_workflows")
        .select("id, proof_id, status")
        .eq("id", stage.workflow_id)
        .single();

    if (!workflow || workflow.status !== "active") return { error: "Workflow não está ativo" };

    // Check proof lock
    const { data: proof } = await supabaseAdmin
        .from("proofs")
        .select("locked_at, title")
        .eq("id", workflow.proof_id)
        .single();

    if (proof?.locked_at) return { error: "Proof está travado" };

    // Upsert decision
    const { error: decError } = await supabaseAdmin
        .from("stage_decisions")
        .upsert({
            stage_id: stageId,
            user_id: user.id,
            decision,
            comment: comment || null,
            decided_at: new Date().toISOString(),
        }, { onConflict: "stage_id,user_id" });

    if (decError) return { error: decError.message };

    await logActivity({
        proofId: workflow.proof_id,
        action: "stage_decision",
        metadata: {
            stage_name: stage.name,
            stage_index: stage.stage_index,
            decision,
        },
    });

    // Check if stage should advance
    await checkStageCompletion(stageId);

    revalidatePath(`/proofs/${workflow.proof_id}`);
    return { error: null };
}

// ─── Stage Completion & Auto-Advance ───

async function getStageReviewerUserIds(stageId: string): Promise<string[]> {
    // Get direct user assignments
    const { data: directUsers } = await supabaseAdmin
        .from("stage_reviewers")
        .select("user_id")
        .eq("stage_id", stageId)
        .not("user_id", "is", null);

    const userIds = new Set<string>();
    for (const r of directUsers ?? []) {
        if (r.user_id) userIds.add(r.user_id);
    }

    // Get group members
    const { data: groupReviewers } = await supabaseAdmin
        .from("stage_reviewers")
        .select("group_id")
        .eq("stage_id", stageId)
        .not("group_id", "is", null);

    for (const gr of groupReviewers ?? []) {
        if (gr.group_id) {
            const { data: members } = await supabaseAdmin
                .from("contact_group_members")
                .select("user_id")
                .eq("group_id", gr.group_id);

            for (const m of members ?? []) {
                userIds.add(m.user_id);
            }
        }
    }

    return Array.from(userIds);
}

async function getReviewerRecipients(stageId: string): Promise<{ email: string; name?: string }[]> {
    const userIds = await getStageReviewerUserIds(stageId);
    if (userIds.length === 0) return [];
    const { data: users } = await supabaseAdmin
        .from("users")
        .select("email, full_name")
        .in("id", userIds);
    return (users ?? []).filter(u => u.email).map(u => ({ email: u.email, name: u.full_name || undefined }));
}

async function getProofContext(proofId: string) {
    const { data } = await supabaseAdmin
        .from("proofs")
        .select("title, project_id, projects ( organization_id )")
        .eq("id", proofId)
        .single();
    return {
        title: data?.title || "Prova",
        orgId: (data as any)?.projects?.organization_id || undefined,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/proofs/${proofId}`,
    };
}

async function getWorkflowOwnerRecipients(workflowId: string): Promise<{ email: string; name?: string }[]> {
    const { data: wf } = await supabaseAdmin
        .from("proof_workflows")
        .select("started_by")
        .eq("id", workflowId)
        .single();
    if (!wf?.started_by) return [];
    const { data: user } = await supabaseAdmin
        .from("users")
        .select("email, full_name")
        .eq("id", wf.started_by)
        .single();
    if (!user?.email) return [];
    return [{ email: user.email, name: user.full_name || undefined }];
}

async function checkStageCompletion(stageId: string) {
    // Get stage data
    const { data: stage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id, workflow_id, stage_index, approval_threshold, status, name")
        .eq("id", stageId)
        .single();

    if (!stage || stage.status !== "active") return;

    // Get all expected reviewer user IDs
    const reviewerIds = await getStageReviewerUserIds(stageId);
    if (reviewerIds.length === 0) return; // No reviewers, don't auto-advance

    // Get decisions for this stage
    const { data: decisions } = await supabaseAdmin
        .from("stage_decisions")
        .select("user_id, decision")
        .eq("stage_id", stageId);

    const decisionMap = new Map((decisions ?? []).map(d => [d.user_id, d.decision]));

    // Check for rejections
    const hasRejection = Array.from(decisionMap.values()).some(d => d === "rejected");
    if (hasRejection) {
        await supabaseAdmin.from("workflow_stages").update({
            status: "rejected",
            completed_at: new Date().toISOString(),
        }).eq("id", stageId);

        // Get workflow to update proof status
        const { data: workflow } = await supabaseAdmin
            .from("proof_workflows")
            .select("proof_id")
            .eq("id", stage.workflow_id)
            .single();

        if (workflow) {
            await supabaseAdmin.from("proofs").update({
                status: "changes_requested",
            }).eq("id", workflow.proof_id);

            await logActivity({
                proofId: workflow.proof_id,
                action: "stage_rejected",
                metadata: { stage_name: stage.name, stage_index: stage.stage_index },
            });

            // Notify workflow owner about rejection
            const ctx = await getProofContext(workflow.proof_id);
            const ownerRecipients = await getWorkflowOwnerRecipients(stage.workflow_id);
            const totalStages = await supabaseAdmin
                .from("workflow_stages").select("id", { count: "exact", head: true })
                .eq("workflow_id", stage.workflow_id);
            if (ownerRecipients.length > 0) {
                notifyStageComplete({
                    proofTitle: ctx.title,
                    proofUrl: ctx.url,
                    stageName: stage.name,
                    stageResult: "rejected",
                    stageIndex: stage.stage_index,
                    totalStages: totalStages.count ?? 1,
                    recipients: ownerRecipients,
                    orgId: ctx.orgId,
                }).catch(() => { });
            }
        }
        return;
    }

    // Count approvals (approved + approved_with_changes)
    const approvals = Array.from(decisionMap.values()).filter(
        d => d === "approved" || d === "approved_with_changes"
    ).length;

    const threshold = stage.approval_threshold;
    let shouldAdvance = false;

    if (threshold > 0) {
        // Threshold mode: advance when approvals >= threshold
        shouldAdvance = approvals >= threshold;
    } else {
        // All-must-approve mode: advance when all reviewers have approved
        shouldAdvance = approvals === reviewerIds.length;
    }

    if (!shouldAdvance) return;

    // Mark current stage as approved
    await supabaseAdmin.from("workflow_stages").update({
        status: "approved",
        completed_at: new Date().toISOString(),
    }).eq("id", stageId);

    // Get workflow
    const { data: workflow } = await supabaseAdmin
        .from("proof_workflows")
        .select("id, proof_id, current_stage_index")
        .eq("id", stage.workflow_id)
        .single();

    if (!workflow) return;

    // Check if there's a next stage
    const nextIndex = stage.stage_index + 1;
    const { data: nextStage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id")
        .eq("workflow_id", workflow.id)
        .eq("stage_index", nextIndex)
        .single();

    const ctx = await getProofContext(workflow.proof_id);
    const totalStagesResult = await supabaseAdmin
        .from("workflow_stages").select("id", { count: "exact", head: true })
        .eq("workflow_id", workflow.id);
    const totalStages = totalStagesResult.count ?? 1;

    if (nextStage) {
        // Advance to next stage
        await supabaseAdmin.from("workflow_stages").update({
            status: "active",
            started_at: new Date().toISOString(),
        }).eq("id", nextStage.id);

        await supabaseAdmin.from("proof_workflows").update({
            current_stage_index: nextIndex,
        }).eq("id", workflow.id);

        await logActivity({
            proofId: workflow.proof_id,
            action: "stage_advanced",
            metadata: { from_stage: stage.stage_index, to_stage: nextIndex },
        });

        // Get next stage info for notifications
        const { data: nextStageInfo } = await supabaseAdmin
            .from("workflow_stages")
            .select("id, name, description, deadline")
            .eq("id", nextStage.id)
            .single();

        // Notify owner that stage completed
        const ownerRecipients = await getWorkflowOwnerRecipients(workflow.id);
        if (ownerRecipients.length > 0) {
            notifyStageComplete({
                proofTitle: ctx.title,
                proofUrl: ctx.url,
                stageName: stage.name,
                stageResult: "approved",
                stageIndex: stage.stage_index,
                totalStages,
                nextStageName: nextStageInfo?.name,
                recipients: ownerRecipients,
                orgId: ctx.orgId,
            }).catch(() => { });
        }

        // Notify next stage reviewers
        if (nextStageInfo) {
            const nextRecipients = await getReviewerRecipients(nextStageInfo.id);
            if (nextRecipients.length > 0) {
                notifyStageStart({
                    proofTitle: ctx.title,
                    proofUrl: ctx.url,
                    stageName: nextStageInfo.name,
                    stageIndex: nextIndex,
                    totalStages,
                    stageDescription: nextStageInfo.description || undefined,
                    deadline: nextStageInfo.deadline || undefined,
                    recipients: nextRecipients,
                    orgId: ctx.orgId,
                }).catch(() => { });
            }
        }
    } else {
        // Final stage completed → workflow done
        await supabaseAdmin.from("proof_workflows").update({
            status: "completed",
            completed_at: new Date().toISOString(),
        }).eq("id", workflow.id);

        await supabaseAdmin.from("proofs").update({
            status: "approved",
        }).eq("id", workflow.proof_id);

        await logActivity({
            proofId: workflow.proof_id,
            action: "workflow_completed",
            metadata: { total_stages: nextIndex },
        });

        // Notify owner that workflow is complete
        const ownerRecipients = await getWorkflowOwnerRecipients(workflow.id);
        if (ownerRecipients.length > 0) {
            notifyWorkflowComplete({
                proofTitle: ctx.title,
                proofUrl: ctx.url,
                totalStages,
                recipients: ownerRecipients,
                orgId: ctx.orgId,
            }).catch(() => { });
        }
    }
}

// ─── Manual Stage Control ───

export async function advanceStage(workflowId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: workflow } = await supabaseAdmin
        .from("proof_workflows")
        .select("id, proof_id, current_stage_index, status")
        .eq("id", workflowId)
        .single();

    if (!workflow || workflow.status !== "active") return { error: "Workflow não está ativo" };

    // Mark current stage as skipped
    await supabaseAdmin.from("workflow_stages").update({
        status: "skipped",
        completed_at: new Date().toISOString(),
    }).eq("workflow_id", workflowId).eq("stage_index", workflow.current_stage_index);

    // Advance
    const nextIndex = workflow.current_stage_index + 1;
    const { data: nextStage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id")
        .eq("workflow_id", workflowId)
        .eq("stage_index", nextIndex)
        .single();

    if (nextStage) {
        await supabaseAdmin.from("workflow_stages").update({
            status: "active",
            started_at: new Date().toISOString(),
        }).eq("id", nextStage.id);

        await supabaseAdmin.from("proof_workflows").update({
            current_stage_index: nextIndex,
        }).eq("id", workflowId);
    } else {
        await supabaseAdmin.from("proof_workflows").update({
            status: "completed",
            completed_at: new Date().toISOString(),
        }).eq("id", workflowId);

        await supabaseAdmin.from("proofs").update({
            status: "approved",
        }).eq("id", workflow.proof_id);
    }

    await logActivity({
        proofId: workflow.proof_id,
        action: "stage_skipped",
        metadata: { skipped_index: workflow.current_stage_index },
    });

    revalidatePath(`/proofs/${workflow.proof_id}`);
    return { error: null };
}

export async function cancelWorkflow(workflowId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: workflow } = await supabaseAdmin
        .from("proof_workflows")
        .select("id, proof_id")
        .eq("id", workflowId)
        .single();

    if (!workflow) return { error: "Workflow não encontrado" };

    await supabaseAdmin.from("proof_workflows").update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
    }).eq("id", workflowId);

    await logActivity({
        proofId: workflow.proof_id,
        action: "workflow_cancelled",
        metadata: {},
    });

    revalidatePath(`/proofs/${workflow.proof_id}`);
    return { error: null };
}

// ─── Utility: Restart rejected stage ───

export async function restartStage(stageId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: stage } = await supabaseAdmin
        .from("workflow_stages")
        .select("id, status, workflow_id")
        .eq("id", stageId)
        .single();

    if (!stage) return { error: "Etapa não encontrada" };
    if (stage.status !== "rejected") return { error: "Só etapas rejeitadas podem ser reiniciadas" };

    // Clear decisions for this stage
    await supabaseAdmin.from("stage_decisions").delete().eq("stage_id", stageId);

    // Reset stage to active
    await supabaseAdmin.from("workflow_stages").update({
        status: "active",
        started_at: new Date().toISOString(),
        completed_at: null,
    }).eq("id", stageId);

    // Get workflow to update proof
    const { data: workflow } = await supabaseAdmin
        .from("proof_workflows")
        .select("proof_id")
        .eq("id", stage.workflow_id)
        .single();

    if (workflow) {
        await supabaseAdmin.from("proofs").update({
            status: "in_review",
        }).eq("id", workflow.proof_id);

        await logActivity({
            proofId: workflow.proof_id,
            action: "stage_restarted",
            metadata: { stage_id: stageId },
        });

        // Notify reviewers that stage was restarted
        const { data: restartedStage } = await supabaseAdmin
            .from("workflow_stages")
            .select("id, name, description, deadline, stage_index, workflow_id")
            .eq("id", stageId)
            .single();

        if (restartedStage) {
            const recipients = await getReviewerRecipients(restartedStage.id);
            const ctx = await getProofContext(workflow.proof_id);
            const totalStagesResult = await supabaseAdmin
                .from("workflow_stages").select("id", { count: "exact", head: true })
                .eq("workflow_id", restartedStage.workflow_id);
            if (recipients.length > 0) {
                notifyStageStart({
                    proofTitle: ctx.title,
                    proofUrl: ctx.url,
                    stageName: restartedStage.name,
                    stageIndex: restartedStage.stage_index,
                    totalStages: totalStagesResult.count ?? 1,
                    stageDescription: restartedStage.description || undefined,
                    deadline: restartedStage.deadline || undefined,
                    recipients,
                    orgId: ctx.orgId,
                }).catch(() => { });
            }
        }

        revalidatePath(`/proofs/${workflow.proof_id}`);
    }

    return { error: null };
}
