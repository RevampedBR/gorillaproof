"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Webhook Management ───

export async function getWebhooks(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("webhooks")
            .select("id, url, events, is_active, created_at")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });

        return { data: data ?? [], error: error?.message ?? null };
    } catch (err) {
        return { data: [], error: "Failed to fetch webhooks" };
    }
}

export async function createWebhook(orgId: string, url: string, events: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    if (!url || !url.startsWith("https://")) return { error: "URL must start with https://" };

    try {
        const secret = crypto.randomUUID().replace(/-/g, "");
        const { error } = await supabase.from("webhooks").insert({
            organization_id: orgId,
            url,
            events,
            secret,
        });

        if (error) return { error: error.message };
        return { error: null, secret };
    } catch (err) {
        return { error: "Failed to create webhook" };
    }
}

export async function deleteWebhook(webhookId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase.from("webhooks").delete().eq("id", webhookId);
        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: "Failed to delete webhook" };
    }
}

export async function toggleWebhook(webhookId: string, isActive: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase.from("webhooks").update({ is_active: isActive }).eq("id", webhookId);
        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: "Failed to toggle webhook" };
    }
}

// ─── Webhook Event Dispatcher ───

export type WebhookEvent = "proof.approved" | "proof.rejected" | "proof.commented" | "proof.uploaded" | "proof.status_changed" | "proof.locked";

export async function dispatchWebhookEvent(orgId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const supabase = await createClient();

    try {
        const { data: webhooks } = await supabase
            .from("webhooks")
            .select("url, secret, events")
            .eq("organization_id", orgId)
            .eq("is_active", true);

        if (!webhooks || webhooks.length === 0) return;

        const matchingHooks = webhooks.filter((w) => w.events.includes(event) || w.events.length === 0);

        await Promise.allSettled(
            matchingHooks.map((hook) =>
                fetch(hook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-GorillaProof-Event": event,
                        "X-GorillaProof-Secret": hook.secret || "",
                    },
                    body: JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload }),
                }).catch(() => { })
            )
        );
    } catch {
        // Webhooks should never break the main flow
    }
}
