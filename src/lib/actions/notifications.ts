"use server";

import { createClient } from "@/utils/supabase/server";

export interface NotificationPrefs {
    email_on_comment: boolean;
    email_on_decision: boolean;
    email_on_mention: boolean;
    email_on_deadline: boolean;
}

export async function getNotificationPrefs(): Promise<{ data: NotificationPrefs | null; error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("notification_preferences")
            .select("email_on_comment, email_on_decision, email_on_mention, email_on_deadline")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) return { data: null, error: error.message };

        // Return defaults if no row exists yet
        return {
            data: data || { email_on_comment: true, email_on_decision: true, email_on_mention: true, email_on_deadline: true },
            error: null,
        };
    } catch (err) {
        return { data: null, error: "Failed to fetch preferences" };
    }
}

export async function updateNotificationPrefs(prefs: Partial<NotificationPrefs>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("notification_preferences")
            .upsert({
                user_id: user.id,
                ...prefs,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: "Failed to update preferences" };
    }
}
