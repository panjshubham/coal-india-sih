import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== SCHEMA ===");
    const schemaQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `;
    const schemaRes = await client.query(schemaQuery);
    console.table(schemaRes.rows);

    console.log("\n=== AUDIT LEDGER TRIGGERS ===");
    const triggerQuery = `
      SELECT event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'audit_ledger';
    `;
    const triggerRes = await client.query(triggerQuery);
    console.table(triggerRes.rows);

    console.log("\n=== SAMPLE MINES ===");
    const minesRes = await client.query(`SELECT * FROM mines LIMIT 3;`);
    console.table(minesRes.rows);

    console.log("\n=== SAMPLE INSPECTIONS ===");
    const inspRes = await client.query(`SELECT * FROM inspections LIMIT 3;`);
    console.table(inspRes.rows);
  } finally {
    client.release();
    pool.end();
  }
}
main();
