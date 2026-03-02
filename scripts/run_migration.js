// Quick script to run migration against Supabase
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    "https://kdakstzqxcubhyfvevrb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWtzdHpxeGN1Ymh5ZnZldnJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4MTQwMCwiZXhwIjoyMDg3MjU3NDAwfQ.X7klYqGWW0b_dN3LBjrRFpoDmcA-c2qjUeX0imY9iCM",
    { db: { schema: "public" } }
);

async function run() {
    console.log("🔧 Running migration...\n");

    // Step 1: Create clients table
    const { error: e1 } = await supabase.rpc("exec_sql", {
        sql: `
            CREATE TABLE IF NOT EXISTS clients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        `
    });
    if (e1) {
        console.log("Step 1 error:", e1.message);
        // Try alternative: check if table already exists
        const { data } = await supabase.from("clients").select("id").limit(1);
        if (data !== null) {
            console.log("✓ clients table already exists");
        } else {
            console.log("✗ Cannot create table via RPC. Need to run SQL manually.");
            console.log("Copy the SQL from: supabase/migrations/20260223_add_clients_table.sql");
            console.log("And run it in the Supabase SQL Editor at:");
            console.log("https://supabase.com/dashboard/project/kdakstzqxcubhyfvevrb/sql/new");
            return;
        }
    } else {
        console.log("✓ Created clients table");
    }

    // Step 2: Check if client_id column exists
    const { data: projects } = await supabase.from("projects").select("id, name, organization_id").limit(1);
    console.log("Projects sample:", projects);

    // Step 3: Try to read from clients
    const { data: clients, error: ce } = await supabase.from("clients").select("*");
    console.log("Clients:", clients, "Error:", ce?.message);
}

run().catch(console.error);
