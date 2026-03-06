import { NextResponse } from "next/server";
import { sendAutomatedReminders } from "@/lib/actions/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
    // Verify cron secret in production
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const result = await sendAutomatedReminders();

        console.log(
            `[Cron Reminders] Deadline: ${result.deadlineReminders}, Pending: ${result.pendingReminders}, Errors: ${result.errors.length}`
        );

        return NextResponse.json({
            success: true,
            deadlineReminders: result.deadlineReminders,
            pendingReminders: result.pendingReminders,
            errors: result.errors,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Cron Reminders] Fatal error:", error);
        return NextResponse.json(
            { error: "Falha ao processar lembretes" },
            { status: 500 }
        );
    }
}
