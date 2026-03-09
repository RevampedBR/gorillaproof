import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BetaBugsKanban } from "@/components/beta/beta-bugs-kanban";

export const dynamic = "force-dynamic";

export default async function BetaBugsPage() {
    // Server-side admin check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email?.endsWith("@gorillaproof.com.br")) {
        redirect("/dashboard");
    }

    return <BetaBugsKanban />;
}
