"use server";

import { createClient } from "@/utils/supabase/server";

export interface ProofAnalytics {
    totalProofs: number;
    totalVersions: number;
    approvedCount: number;
    inReviewCount: number;
    changesRequestedCount: number;
    rejectedCount: number;
    completedCount: number;
    avgTurnaroundDays: number | null;
    lateProofs: number;
    completionRate: number;
    proofsThisWeek: number;
    proofsLastWeek: number;
}

/**
 * Get analytics for all proofs in the user's organization.
 */
export async function getAnalytics(): Promise<{ data: ProofAnalytics | null; error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get user's org
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) return { data: null, error: "No organization" };

    // Get all projects in org
    const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", membership.organization_id);

    if (!projects || projects.length === 0) {
        return {
            data: {
                totalProofs: 0, totalVersions: 0, approvedCount: 0, inReviewCount: 0,
                changesRequestedCount: 0, rejectedCount: 0, completedCount: 0,
                avgTurnaroundDays: null, lateProofs: 0, completionRate: 0,
                proofsThisWeek: 0, proofsLastWeek: 0,
            },
            error: null,
        };
    }

    const projectIds = projects.map((p) => p.id);

    // Get all proofs with versions
    const { data: proofs } = await supabase
        .from("proofs")
        .select("id, status, deadline, created_at, updated_at, versions ( id )")
        .in("project_id", projectIds);

    if (!proofs) return { data: null, error: "Failed to fetch proofs" };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

    const totalProofs = proofs.length;
    const totalVersions = proofs.reduce((acc, p: any) => acc + (p.versions?.length || 0), 0);
    const approvedCount = proofs.filter((p) => p.status === "approved").length;
    const inReviewCount = proofs.filter((p) => p.status === "in_review").length;
    const changesRequestedCount = proofs.filter((p) => p.status === "changes_requested").length;
    const rejectedCount = proofs.filter((p) => p.status === "rejected").length;
    const completedCount = proofs.filter((p) => ["approved", "rejected", "not_relevant"].includes(p.status)).length;

    // Turnaround: avg days from created to completed status
    const completedProofs = proofs.filter((p) => ["approved", "rejected"].includes(p.status));
    let avgTurnaroundDays: number | null = null;
    if (completedProofs.length > 0) {
        const totalDays = completedProofs.reduce((acc, p) => {
            const created = new Date(p.created_at).getTime();
            const updated = new Date(p.updated_at).getTime();
            return acc + (updated - created) / 86400000;
        }, 0);
        avgTurnaroundDays = Math.round((totalDays / completedProofs.length) * 10) / 10;
    }

    // Late proofs (past deadline, not completed)
    const lateProofs = proofs.filter((p) => {
        if (!p.deadline) return false;
        return new Date(p.deadline) < now && !["approved", "rejected", "not_relevant"].includes(p.status);
    }).length;

    // Completion rate
    const completionRate = totalProofs > 0 ? Math.round((completedCount / totalProofs) * 100) : 0;

    // Proofs created this week vs last week
    const proofsThisWeek = proofs.filter((p) => new Date(p.created_at) >= weekAgo).length;
    const proofsLastWeek = proofs.filter((p) => {
        const d = new Date(p.created_at);
        return d >= twoWeeksAgo && d < weekAgo;
    }).length;

    return {
        data: {
            totalProofs, totalVersions, approvedCount, inReviewCount,
            changesRequestedCount, rejectedCount, completedCount,
            avgTurnaroundDays, lateProofs, completionRate,
            proofsThisWeek, proofsLastWeek,
        },
        error: null,
    };
}
