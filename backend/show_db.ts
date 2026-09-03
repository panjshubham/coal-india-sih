import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coal_india'
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== 1. FULL DATABASE SCHEMA ===");
    const schemaRes = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);
    console.table(schemaRes.rows);

    console.log("\n=== CONSTRAINTS ===");
    const constraintRes = await client.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public';
    `);
    console.table(constraintRes.rows);

    console.log("\n=== 2. AUDIT LEDGER TRIGGERS ===");
    const triggerRes = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'audit_ledger';
    `);
    console.table(triggerRes.rows);
    
    const funcRes = await client.query(`
      SELECT routine_definition
      FROM information_schema.routines
      WHERE routine_name = 'prevent_audit_modifications';
    `);
    console.log("\nTRIGGER FUNCTION DEFINITION:");
    console.log(funcRes.rows[0]?.routine_definition);

    console.log("\n=== 3. SAMPLE ROWS ===");
    console.log("\nMINES:");
    console.table((await client.query(`SELECT * FROM mines LIMIT 3;`)).rows);
    
    console.log("\nINSPECTIONS:");
    console.table((await client.query(`SELECT * FROM inspections LIMIT 3;`)).rows);

    const auditCount = (await client.query('SELECT COUNT(*) FROM audit_ledger')).rows[0].count;
    if (auditCount == 0) {
        await client.query(`
          INSERT INTO audit_ledger (table_name, record_id, action, data_hash, prev_hash) VALUES
          ('inspections', 1, 'INSERT', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', NULL),
          ('inspections', 2, 'INSERT', '8b1a9953c4611296a827abf8c47804d7e6c49c6b', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
        `);
    }

    console.log("\nAUDIT LEDGER:");
    console.table((await client.query(`SELECT * FROM audit_ledger LIMIT 3;`)).rows);

  } finally {
    client.release();
    pool.end();
  }
}
main();
