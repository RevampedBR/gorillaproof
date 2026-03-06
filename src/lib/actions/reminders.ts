"use server";

import { supabaseAdmin } from "@/utils/supabase/admin";
import { notifyDeadlineApproaching, notifyPendingReview } from "@/lib/actions/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://app.gorillaproof.com";

interface ReminderResult {
    deadlineReminders: number;
    pendingReminders: number;
    errors: string[];
}

export async function sendAutomatedReminders(): Promise<ReminderResult> {
    const result: ReminderResult = { deadlineReminders: 0, pendingReminders: 0, errors: [] };

    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        // 1. Deadline approaching in next 48h (not yet overdue, not completed)
        const { data: dueSoon } = await supabaseAdmin
            .from("proofs")
            .select(`
                id, title, deadline, project_id,
                projects ( organization_id, title,
                    clients ( name )
                )
            `)
            .gte("deadline", now.toISOString())
            .lte("deadline", in48h.toISOString())
            .not("status", "in", '("approved","rejected","not_relevant")')
            .order("deadline", { ascending: true });

        for (const proof of dueSoon ?? []) {
            try {
                const orgId = (proof as any).projects?.organization_id;
                if (!orgId) continue;

                // Get org members to notify
                const { data: members } = await supabaseAdmin
                    .from("organization_members")
                    .select("user_id, users ( email, full_name )")
                    .eq("organization_id", orgId);

                const recipients = (members ?? [])
                    .map((m: any) => ({ email: m.users?.email, name: m.users?.full_name }))
                    .filter((r: any) => r.email);

                if (recipients.length === 0) continue;

                await notifyDeadlineApproaching({
                    proofTitle: proof.title || "Sem titulo",
                    proofUrl: `${SITE_URL}/pt/proofs/${proof.id}`,
                    deadline: proof.deadline!,
                    recipients,
                    orgId,
                });
                result.deadlineReminders++;
            } catch (err) {
                result.errors.push(`Deadline reminder failed for proof ${proof.id}: ${err}`);
            }
        }

        // 2. Pending reviewers (proofs awaiting_review or in_review for more than 2 days)
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        const { data: pendingProofs } = await supabaseAdmin
            .from("proofs")
            .select(`
                id, title, updated_at, project_id,
                projects ( organization_id )
            `)
            .in("status", ["awaiting_review", "in_review"])
            .lte("updated_at", twoDaysAgo.toISOString())
            .order("updated_at", { ascending: true })
            .limit(50);

        for (const proof of pendingProofs ?? []) {
            try {
                const orgId = (proof as any).projects?.organization_id;
                if (!orgId) continue;

                const daysPending = Math.ceil(
                    (now.getTime() - new Date(proof.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                );

                // Get assigned reviewers or all org members
                const { data: reviewers } = await supabaseAdmin
                    .from("proof_reviewers")
                    .select("user_id, users ( email, full_name )")
                    .eq("proof_id", proof.id);

                let recipients: { email: string; name?: string }[];

                if (reviewers && reviewers.length > 0) {
                    recipients = reviewers
                        .map((r: any) => ({ email: r.users?.email, name: r.users?.full_name }))
                        .filter((r: any) => r.email);
                } else {
                    // Fallback to all org members
                    const { data: members } = await supabaseAdmin
                        .from("organization_members")
                        .select("user_id, users ( email, full_name )")
                        .eq("organization_id", orgId);

                    recipients = (members ?? [])
                        .map((m: any) => ({ email: m.users?.email, name: m.users?.full_name }))
                        .filter((r: any) => r.email);
                }

                if (recipients.length === 0) continue;

                await notifyPendingReview({
                    proofTitle: proof.title || "Sem titulo",
                    proofUrl: `${SITE_URL}/pt/proofs/${proof.id}`,
                    daysPending,
                    recipients,
                    orgId,
                });
                result.pendingReminders++;
            } catch (err) {
                result.errors.push(`Pending reminder failed for proof ${proof.id}: ${err}`);
            }
        }
    } catch (err) {
        result.errors.push(`Global error: ${err}`);
    }

    return result;
}
