import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Public API: Get proof status by share token
 * GET /api/proofs/status?token=<share_token>
 */
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        const { data: proof, error } = await supabase
            .from("proofs")
            .select("id, title, status, deadline, updated_at, locked_at")
            .eq("share_token", token)
            .single();

        if (error || !proof) {
            return NextResponse.json({ error: "Proof not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: proof.id,
            title: proof.title,
            status: proof.status,
            deadline: proof.deadline,
            updated_at: proof.updated_at,
            is_locked: !!proof.locked_at,
        });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
