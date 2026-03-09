"use server";

import { createClient } from "@/utils/supabase/server";

/* ═══ TYPES ═══ */

export interface BetaFeedback {
    id: string;
    organization_id: string | null;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    type: "bug" | "suggestion" | "confusion";
    severity: "blocker" | "annoying" | "cosmetic";
    description: string;
    expected_behavior: string | null;
    screenshot_url: string | null;
    status: "new" | "triaging" | "in_progress" | "resolved" | "wont_fix";
    admin_notes: string | null;
    page_url: string | null;
    browser_info: string | null;
    screen_resolution: string | null;
    console_errors: unknown[];
    created_at: string;
    resolved_at: string | null;
}

export interface SubmitFeedbackInput {
    type: "bug" | "suggestion" | "confusion";
    severity: "blocker" | "annoying" | "cosmetic";
    description: string;
    expectedBehavior?: string;
    pageUrl: string;
    browserInfo: string;
    screenResolution: string;
    consoleErrors: unknown[];
    screenshotBase64?: string;
}

/* ═══ SUBMIT FEEDBACK ═══ */

export async function submitFeedback(input: SubmitFeedbackInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Get user's org
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    // Get user profile
    const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

    let screenshotUrl: string | null = null;

    // Upload screenshot if provided
    if (input.screenshotBase64) {
        const base64Data = input.screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `beta-feedback/${user.id}/${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
            .from("assets")
            .upload(fileName, buffer, {
                contentType: "image/png",
                upsert: false,
            });

        if (!uploadError) {
            const { data: urlData } = supabase.storage
                .from("assets")
                .getPublicUrl(fileName);
            screenshotUrl = urlData.publicUrl;
        }
    }

    const { error } = await supabase.from("beta_feedback").insert({
        organization_id: membership?.organization_id || null,
        user_id: user.id,
        user_email: user.email,
        user_name: profile?.full_name || user.email,
        type: input.type,
        severity: input.severity,
        description: input.description,
        expected_behavior: input.expectedBehavior || null,
        screenshot_url: screenshotUrl,
        page_url: input.pageUrl,
        browser_info: input.browserInfo,
        screen_resolution: input.screenResolution,
        console_errors: input.consoleErrors,
    });

    if (error) return { error: error.message };
    return { error: null };
}

/* ═══ GET FEEDBACK LIST (Admin) ═══ */

export async function getFeedbackList(statusFilter?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Não autenticado" };

    // Check admin email
    if (!user.email?.endsWith("@gorillaproof.com.br")) {
        return { data: [], error: "Acesso restrito" };
    }

    let query = supabase
        .from("beta_feedback")
        .select("*")
        .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    return { data: (data as BetaFeedback[]) || [], error: error?.message || null };
}

/* ═══ UPDATE FEEDBACK STATUS (Admin) ═══ */

export async function updateFeedbackStatus(
    id: string,
    status: BetaFeedback["status"],
    adminNotes?: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    if (!user.email?.endsWith("@gorillaproof.com.br")) {
        return { error: "Acesso restrito" };
    }

    const updateData: Record<string, unknown> = { status };
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
    if (status === "resolved" || status === "wont_fix") {
        updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from("beta_feedback")
        .update(updateData)
        .eq("id", id);

    if (error) return { error: error.message };
    return { error: null };
}

/* ═══ UPLOAD SCREENSHOT FILE (Admin or User) ═══ */

export async function uploadFeedbackScreenshot(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { url: null, error: "Não autenticado" };

    const file = formData.get("file") as File;
    if (!file) return { url: null, error: "Nenhum arquivo" };

    const fileName = `beta-feedback/${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

    return { url: urlData.publicUrl, error: null };
}
