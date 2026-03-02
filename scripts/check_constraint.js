const { Client } = require("pg");
const fs = require("fs");

const envFile = fs.readFileSync(".env.local", "utf8");
let dbUrl = "";
envFile.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && match[1].trim() === "DATABASE_URL") {
        dbUrl = match[2].trim();
    }
});

const client = new Client({ connectionString: dbUrl });

async function check() {
    await client.connect();
    const res = await client.query(`
        SELECT pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'proofs_status_check' AND t.relname = 'proofs';
    `);
    console.log(res.rows[0]?.def || "Constraint not found");
    await client.end();
}
check();
