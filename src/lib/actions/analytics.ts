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

    // ── BATCH 1: Parallel fetch of projects + clients ──
    const [projectsRes, clientsRes] = await Promise.all([
        supabase.from("projects").select("id, name, client_id").eq("organization_id", membership.organization_id),
        supabase.from("clients").select("id, name").eq("organization_id", membership.organization_id),
    ]);

    const projects = projectsRes.data || [];
    const clientRows = clientsRes.data || [];
    const clientMap = new Map(clientRows.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const clientIds = clientRows.map((c) => c.id);
    if (clientIds.length === 0) {
        return { data: emptyDashboard(), error: null };
    }

    // ── BATCH 2: Proofs (main data source) ──
    const { data: proofs, error: proofsError } = await supabase
        .from("proofs")
        .select("id, title, status, deadline, created_at, updated_at, project_id, client_id")
        .in("client_id", clientIds);

    if (proofsError || !proofs) {
        console.error("[getDashboardData] Proofs query error:", proofsError?.message);
        return { data: emptyDashboard(), error: null };
    }

    const proofIds = proofs.map((p) => p.id);
    if (proofIds.length === 0) {
        return { data: emptyDashboard(), error: null };
    }

    // ── BATCH 3: Parallel fetch of versions, comments, recent activity, last_viewed ──
    const [versionsRes, lastViewedRes, recentProofsRes] = await Promise.all([
        supabase.from("versions").select("id, proof_id").in("proof_id", proofIds),
        supabase.from("proofs").select("id, last_viewed_at").in("client_id", clientIds).not("last_viewed_at", "is", null).then(r => r).catch(() => ({ data: null })),
        supabase.from("proofs").select("id, title, status, updated_at, project_id, client_id").in("client_id", clientIds).order("updated_at", { ascending: false }).limit(5),
    ]);

    const versionRows = versionsRes.data || [];
    const versionIds = versionRows.map((v) => v.id);
    const versionToProof = new Map(versionRows.map((v) => [v.id, v.proof_id]));

    // Version count per proof (for first-version approval rate)
    const versionCountMap = new Map<string, number>();
    versionRows.forEach((v) => {
        versionCountMap.set(v.proof_id, (versionCountMap.get(v.proof_id) || 0) + 1);
    });

    // Last viewed
    const lastViewedMap = new Map<string, string>();
    ((lastViewedRes as any)?.data || []).forEach((v: any) => {
        if (v.last_viewed_at) lastViewedMap.set(v.id, v.last_viewed_at);
    });

    // ── BATCH 4: Comments (open + recent) in parallel ──
    let openCommentsData: any[] = [];
    let recentCommentsData: any[] = [];
    if (versionIds.length > 0) {
        const [openRes, recentRes] = await Promise.all([
            supabase.from("comments").select("id, version_id").in("version_id", versionIds).is("parent_comment_id", null).eq("status", "open"),
            supabase.from("comments").select("id, content, status, created_at, user_id, version_id").in("version_id", versionIds).is("parent_comment_id", null).order("created_at", { ascending: false }).limit(5),
        ]);
        openCommentsData = openRes.data || [];
        recentCommentsData = recentRes.data || [];
    }

    // Open comments count per proof
    const openCommentsMap = new Map<string, number>();
    openCommentsData.forEach((c) => {
        const pId = versionToProof.get(c.version_id);
        if (pId) openCommentsMap.set(pId, (openCommentsMap.get(pId) || 0) + 1);
    });

    // ── Resolve comment authors (single batch) ──
    let recentComments: RecentComment[] = [];
    if (recentCommentsData.length > 0) {
        const proofTitleMap = new Map(proofs.map((p) => [p.id, p.title]));
        const userIds = [...new Set(recentCommentsData.map((c) => c.user_id))];
        const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", userIds);
        const userMap = new Map((users || []).map((u) => [u.id, u]));

        recentComments = recentCommentsData.map((c) => {
            const commentUser = userMap.get(c.user_id);
            const proofId = versionToProof.get(c.version_id);
            return {
                id: c.id,
                content: (() => {
                    const stripped = c.content.replace(/<[^>]*>/g, "").trim();
                    return stripped.length > 80 ? stripped.slice(0, 80) + "…" : stripped;
                })(),
                authorName: commentUser?.full_name || commentUser?.email || "Anônimo",
                proofTitle: proofId ? (proofTitleMap.get(proofId) || "Prova") : "Prova",
                status: c.status,
                createdAt: c.created_at,
            };
        });
    }

    // ── COMPUTE STATS (in-memory, no additional queries) ──
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    const activeProofs = proofs.filter((p) => !["approved", "rejected", "not_relevant"].includes(p.status));
    const totalActive = activeProofs.length;
    const awaitingReview = proofs.filter((p) => p.status === "in_review").length;
    const lateCount = proofs.filter((p) => {
        if (!p.deadline) return false;
        return new Date(p.deadline) < now && !["approved", "rejected", "not_relevant"].includes(p.status);
    }).length;

    const approvedProofs = proofs.filter((p) => p.status === "approved");
    const singleVersionApproved = approvedProofs.filter((p: any) => (versionCountMap.get(p.id) || 1) <= 1).length;
    const firstVersionApprovalRate = approvedProofs.length > 0
        ? Math.round((singleVersionApproved / approvedProofs.length) * 100) : 0;

    const completedProofs = proofs.filter((p) => ["approved", "rejected"].includes(p.status));
    let avgTurnaroundDays: number | null = null;
    if (completedProofs.length > 0) {
        const totalDays = completedProofs.reduce((acc, p) => {
            return acc + (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000;
        }, 0);
        avgTurnaroundDays = Math.round((totalDays / completedProofs.length) * 10) / 10;
    }

    // Helpers
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
    const attentionProofs: AttentionProof[] = proofs
        .filter((p) => {
            const isOverdue = p.deadline && new Date(p.deadline) < now && !["approved", "rejected", "not_relevant"].includes(p.status);
            const hasOpenComments = (openCommentsMap.get(p.id) || 0) > 0;
            const needsChanges = p.status === "changes_requested";
            return isOverdue || hasOpenComments || needsChanges;
        })
        .sort((a, b) => {
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

    // ── RECENT ACTIVITY ──
    const recentProofs = recentProofsRes.data;
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

    // ── DAILY VOLUME (sparkline — computed in-memory) ──
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

/* ═══ CALENDAR DEADLINES ═══ */

export interface CalendarProof {
    id: string;
    title: string;
    status: string;
    deadline: string;
    clientName: string;
    projectName: string | null;
}

export async function getCalendarDeadlines(month: number, year: number): Promise<{ data: CalendarProof[]; error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) return { data: [], error: "Nenhuma organização" };

    const { data: clientRows } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", membership.organization_id);

    const clientIds = (clientRows || []).map(c => c.id);
    if (clientIds.length === 0) return { data: [], error: null };

    const clientMap = new Map((clientRows || []).map(c => [c.id, c.name]));

    // Range: first day of month to last day of month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const { data: proofs } = await supabase
        .from("proofs")
        .select("id, title, status, deadline, client_id, project_id")
        .in("client_id", clientIds)
        .not("deadline", "is", null)
        .gte("deadline", start.toISOString())
        .lte("deadline", end.toISOString());

    if (!proofs) return { data: [], error: null };

    // Get project names
    const projectIds = [...new Set(proofs.map(p => p.project_id).filter(Boolean))];
    const projectMap = new Map<string, string>();
    if (projectIds.length > 0) {
        const { data: projects } = await supabase
            .from("projects")
            .select("id, name")
            .in("id", projectIds);
        (projects || []).forEach(p => projectMap.set(p.id, p.name));
    }

    return {
        data: proofs.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            deadline: p.deadline!,
            clientName: clientMap.get(p.client_id) || "Cliente",
            projectName: p.project_id ? (projectMap.get(p.project_id) || null) : null,
        })),
        error: null,
    };
}
