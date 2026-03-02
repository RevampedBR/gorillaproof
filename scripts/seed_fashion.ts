import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load env vars manually to avoid dotenv dependency issues
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1].trim()] = match[2].trim();
    }
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
    console.log("Starting mock data generation for Fashion Collection...");

    // 1. Get first organization
    const { data: orgs, error: orgErr } = await supabase.from("organizations").select("id").limit(1);

    if (orgErr || !orgs || orgs.length === 0) {
        console.error("Could not find an organization to link the project:", orgErr);
        return;
    }
    const orgId = orgs[0].id;

    // 2. Insert Project
    const { data: project, error: pErr } = await supabase.from("projects").insert({
        name: "Fashion Collection Summer '26 (Mock)",
        description: "Simulação de campanha com imagem, pdf e vídeo integrados.",
        organization_id: orgId,
        status: "active"
    }).select().single();

    if (pErr) {
        console.error("Error creating project:", pErr);
        return;
    }
    console.log("Created Project:", project.id);

    // 3. Insert Proofs with strictly PG constraint valid statuses
    const proofs = [
        {
            title: "Lookbook Cover (Image)",
            status: "approved",
            tags: ["image", "cover"],
            project_id: project.id
        },
        {
            title: "Campaign Teaser (Video)",
            status: "in_review",
            tags: ["video", "social"],
            project_id: project.id
        },
        {
            title: "Collection Catalog (PDF)",
            status: "draft",
            tags: ["pdf", "print"],
            project_id: project.id
        }
    ];

    const { error: prErr } = await supabase.from("proofs").insert(proofs);
    if (prErr) {
        console.error("Error creating proofs:", prErr);
        return;
    }

    console.log("Successfully created 3 custom proofs (Image, Video, PDF). Mock setup complete!");
}

seed();
