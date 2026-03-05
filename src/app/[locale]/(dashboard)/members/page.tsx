import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MembersClient } from "./client";

export default async function MembersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/dashboard");

    return (
        <MembersClient
            orgId={membership.organization_id}
            userRole={membership.role}
            userId={user.id}
        />
    );
}
