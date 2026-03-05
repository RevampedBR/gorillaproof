"use server";

import { createClient } from "@/utils/supabase/server";

/* ═══ TYPES ═══ */

export interface AttentionProof {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    clientName: string;
    projectName: string | null;
    status: string;
    deadline: string | null;
    openComments: number;
    daysOverdue: number;
    lastViewedAt: string | null;
}

export interface UpcomingDeadline {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    clientName: string;
    deadline: string;
    status: string;
    daysLeft: number;
    lastViewedAt: string | null;
}

export interface RecentComment {
    id: string;
    content: string;
    authorName: string;
    proofTitle: string;
    status: string;
    createdAt: string;
}

export interface RecentActivity {
    proofId: string;
    proofTitle: string;
    clientName: string;
    status: string;
    updatedAt: string;
}

export interface DashboardData {
    stats: {
        totalActive: number;
        awaitingReview: number;
        lateCount: number;
        firstVersionApprovalRate: number;
        avgTurnaroundDays: number | null;
    };
    attentionProofs: AttentionProof[];
    upcomingDeadlines: UpcomingDeadline[];
    recentComments: RecentComment[];
    recentActivity: RecentActivity[];
    dailyVolume: number[];
}

/* ═══ MAIN QUERY ═══ */

export async function getDashboardData(): Promise<{ data: DashboardData | null; error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Não autenticado" };

    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) return { data: null, error: "Nenhuma organização" };

    // Get all projects in org
    const { data: projects } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .eq("organization_id", membership.organization_id);

    // Get all clients in org for name lookup
    const { data: clientRows } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", membership.organization_id);
    const clientMap = new Map((clientRows || []).map((c) => [c.id, c.name]));

    if (!projects || projects.length === 0) {
        // Continue — there may be loose proofs with no project
    }

    const projectIds = (projects || []).map((p) => p.id);
    const projectMap = new Map((projects || []).map((p) => [p.id, p]));

    // Get ALL proofs in this org's clients
    const clientIds = (clientRows || []).map((c) => c.id);
    if (clientIds.length === 0) {
        return { data: emptyDashboard(), error: null };
    }

    const { data: proofs, error: proofsError } = await supabase
        .from("proofs")
        .select("id, title, status, deadline, created_at, updated_at, project_id, client_id")
        .in("client_id", clientIds);

    if (proofsError || !proofs) {
        console.error("[getDashboardData] Proofs query error:", proofsError?.message, "clientIds:", clientIds);
        return { data: emptyDashboard(), error: null };
    }

    // Get version counts per proof for first-version approval rate
    const proofIds = proofs.map((p) => p.id);
    const versionCountMap = new Map<string, number>();
    if (proofIds.length > 0) {
        try {
            const { data: versionData } = await supabase
                .from("versions")
                .select("id, proof_id")
                .in("proof_id", proofIds);
            (versionData || []).forEach((v) => {
                versionCountMap.set(v.proof_id, (versionCountMap.get(v.proof_id) || 0) + 1);
            });
        } catch { /* RLS may block some */ }
    }

    // Try to get last_viewed_at (graceful fallback if column doesn't exist)
    const lastViewedMap = new Map<string, string>();
    try {
        const { data: viewData } = await supabase
            .from("proofs")
            .select("id, last_viewed_at")
            .in("client_id", clientIds)
            .not("last_viewed_at", "is", null);
        (viewData || []).forEach((v: any) => {
            if (v.last_viewed_at) lastViewedMap.set(v.id, v.last_viewed_at);
        });
    } catch { /* column may not exist yet */ }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    // ── STATS ──
    const activeProofs = proofs.filter((p) => !["approved", "rejected", "not_relevant"].includes(p.status));
    const totalActive = activeProofs.length;
    const awaitingReview = proofs.filter((p) => p.status === "in_review").length;
    const lateCount = proofs.filter((p) => {
        if (!p.deadline) return false;
        return new Date(p.deadline) < now && !["approved", "rejected", "not_relevant"].includes(p.status);
    }).length;

    // First version approval rate: proofs approved that only have 1 version
    const approvedProofs = proofs.filter((p) => p.status === "approved");
    const singleVersionApproved = approvedProofs.filter((p: any) => (versionCountMap.get(p.id) || 1) <= 1).length;
    const firstVersionApprovalRate = approvedProofs.length > 0
        ? Math.round((singleVersionApproved / approvedProofs.length) * 100) : 0;

    // Avg turnaround
    const completedProofs = proofs.filter((p) => ["approved", "rejected"].includes(p.status));
    let avgTurnaroundDays: number | null = null;
    if (completedProofs.length > 0) {
        const totalDays = completedProofs.reduce((acc, p) => {
            return acc + (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000;
        }, 0);
        avgTurnaroundDays = Math.round((totalDays / completedProofs.length) * 10) / 10;
    }

    // ── OPEN COMMENTS COUNT (batch) ──
    const openCommentsMap = new Map<string, number>();

    if (proofIds.length > 0) {
        const { data: versionRows } = await supabase
            .from("versions")
            .select("id, proof_id")
            .in("proof_id", proofIds);
        const versionIds = (versionRows || []).map((v) => v.id);
        const versionToProof = new Map((versionRows || []).map((v) => [v.id, v.proof_id]));

        if (versionIds.length > 0) {
            const { data: openComments } = await supabase
                .from("comments")
                .select("id, version_id")
                .in("version_id", versionIds)
                .is("parent_comment_id", null)
                .eq("status", "open");

            (openComments || []).forEach((c) => {
                const pId = versionToProof.get(c.version_id);
                if (pId) openCommentsMap.set(pId, (openCommentsMap.get(pId) || 0) + 1);
            });
        }
    }

    // Helper: get client name for a proof
    const getClientName = (p: any): string => {
        const proj = projectMap.get(p.project_id);
        if (proj?.client_id) return clientMap.get(proj.client_id) || "Cliente";
        if (p.client_id) return clientMap.get(p.client_id) || "Cliente";
        return "Cliente";
    };

    const getProjectName = (p: any): string | null => {
        const proj = projectMap.get(p.project_id);
        return proj?.name || null;
    };

    // ── ATTENTION PROOFS ──
    // Proofs that are overdue, have open comments, or have changes_requested
    const attentionProofs: AttentionProof[] = proofs
        .filter((p) => {
            const isOverdue = p.deadline && new Date(p.deadline) < now && !["approved", "rejected", "not_relevant"].includes(p.status);
            const hasOpenComments = (openCommentsMap.get(p.id) || 0) > 0;
            const needsChanges = p.status === "changes_requested";
            return isOverdue || hasOpenComments || needsChanges;
        })
        .sort((a, b) => {
            // Overdue first, then by deadline
            const aOverdue = a.deadline ? new Date(a.deadline) < now : false;
            const bOverdue = b.deadline ? new Date(b.deadline) < now : false;
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
        .slice(0, 6)
        .map((p) => ({
            id: p.id,
            title: p.title,
            thumbnailUrl: null,
            clientName: getClientName(p),
            projectName: getProjectName(p),
            status: p.status,
            deadline: p.deadline,
            openComments: openCommentsMap.get(p.id) || 0,
            daysOverdue: p.deadline && new Date(p.deadline) < now
                ? Math.ceil((now.getTime() - new Date(p.deadline).getTime()) / 86400000)
                : 0,
            lastViewedAt: lastViewedMap.get(p.id) || null,
        }));

    // ── UPCOMING DEADLINES ──
    const upcomingDeadlines: UpcomingDeadline[] = proofs
        .filter((p) => {
            if (!p.deadline) return false;
            const d = new Date(p.deadline);
            return d >= now && d <= weekFromNow && !["approved", "rejected", "not_relevant"].includes(p.status);
        })
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
        .slice(0, 5)
        .map((p) => ({
            id: p.id,
            title: p.title,
            thumbnailUrl: null,
            clientName: getClientName(p),
            deadline: p.deadline!,
            status: p.status,
            daysLeft: Math.ceil((new Date(p.deadline!).getTime() - now.getTime()) / 86400000),
            lastViewedAt: lastViewedMap.get(p.id) || null,
        }));

    // ── RECENT COMMENTS ──
    let recentComments: RecentComment[] = [];
    if (proofIds.length > 0) {
        const { data: versionRows } = await supabase
            .from("versions")
            .select("id, proof_id")
            .in("proof_id", proofIds);
        const versionIds = (versionRows || []).map((v) => v.id);
        const versionToProof = new Map((versionRows || []).map((v) => [v.id, v.proof_id]));
        const proofTitleMap = new Map(proofs.map((p) => [p.id, p.title]));

        if (versionIds.length > 0) {
            const { data: comments } = await supabase
                .from("comments")
                .select("id, content, status, created_at, user_id, version_id")
                .in("version_id", versionIds)
                .is("parent_comment_id", null)
                .order("created_at", { ascending: false })
                .limit(5);

            if (comments && comments.length > 0) {
                const userIds = [...new Set(comments.map((c) => c.user_id))];
                const { data: users } = await supabase
                    .from("users")
                    .select("id, full_name, email")
                    .in("id", userIds);
                const userMap = new Map((users || []).map((u) => [u.id, u]));

                recentComments = comments.map((c) => {
                    const user = userMap.get(c.user_id);
                    const proofId = versionToProof.get(c.version_id);
                    return {
                        id: c.id,
                        content: (() => {
                            const stripped = c.content.replace(/<[^>]*>/g, "").trim();
                            return stripped.length > 80 ? stripped.slice(0, 80) + "…" : stripped;
                        })(),
                        authorName: user?.full_name || user?.email || "Anônimo",
                        proofTitle: proofId ? (proofTitleMap.get(proofId) || "Prova") : "Prova",
                        status: c.status,
                        createdAt: c.created_at,
                    };
                });
            }
        }
    }

    // ── RECENT ACTIVITY ──
    const { data: recentProofs } = await supabase
        .from("proofs")
        .select("id, title, status, updated_at, project_id, client_id")
        .in("client_id", clientIds)
        .order("updated_at", { ascending: false })
        .limit(5);

    let recentActivity: RecentActivity[] = [];
    if (recentProofs && recentProofs.length > 0) {
        recentActivity = recentProofs.map((p) => ({
            proofId: p.id,
            proofTitle: p.title,
            clientName: getClientName(p),
            status: p.status,
            updatedAt: p.updated_at,
        }));
    }

    // ── DAILY VOLUME (sparkline) ──
    const dailyVolume = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - (6 - i));
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return proofs.filter((p) => {
            const d = new Date(p.created_at);
            return d >= dayStart && d < dayEnd;
        }).length;
    });

    return {
        data: {
            stats: {
                totalActive,
                awaitingReview,
                lateCount,
                firstVersionApprovalRate,
                avgTurnaroundDays,
            },
            attentionProofs,
            upcomingDeadlines,
            recentComments,
            recentActivity,
            dailyVolume,
        },
        error: null,
    };
}

/* ═══ EMPTY STATE ═══ */
function emptyDashboard(): DashboardData {
    return {
        stats: { totalActive: 0, awaitingReview: 0, lateCount: 0, firstVersionApprovalRate: 0, avgTurnaroundDays: null },
        attentionProofs: [],
        upcomingDeadlines: [],
        recentComments: [],
        recentActivity: [],
        dailyVolume: [0, 0, 0, 0, 0, 0, 0],
    };
}
