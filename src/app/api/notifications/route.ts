import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 401 });

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    // Get user's org → proofs → latest activity across all proofs
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) return NextResponse.json([]);

    // Get all project IDs for this org
    const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", membership.organization_id);

    if (!projects || projects.length === 0) return NextResponse.json([]);

    const projectIds = projects.map((p) => p.id);

    // Get proof IDs from those projects
    const { data: proofs } = await supabase
        .from("proofs")
        .select("id")
        .in("project_id", projectIds);

    if (!proofs || proofs.length === 0) return NextResponse.json([]);

    const proofIds = proofs.map((p) => p.id);

    // Get latest activity across all proofs
    const { data: entries } = await supabase
        .from("activity_log")
        .select(`
            id, action, metadata, created_at, user_id, proof_id,
            users ( id, full_name, email )
        `)
        .in("proof_id", proofIds)
        .order("created_at", { ascending: false })
        .limit(limit);

    return NextResponse.json(entries ?? []);
}
