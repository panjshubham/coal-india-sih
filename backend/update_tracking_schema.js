import { Client } from 'pg';

const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });

async function runSchemaUpdates() {
  try {
    await client.connect();
    console.log("Connected to database. Running tracking schema updates...");

    // 1. Add tracking_id to tables
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE;`);
    await client.query(`ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE;`);
    await client.query(`ALTER TABLE public.compliance_items ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE;`);
    console.log("Added tracking_id to tables.");

    // 2. Populate existing rows with tracking_id if they don't have one
    await client.query(`UPDATE public.violations SET tracking_id = 'VIOL-2026-' || LPAD(id::text, 5, '0') WHERE tracking_id IS NULL;`);
    await client.query(`UPDATE public.inspections SET tracking_id = 'INSP-2026-' || LPAD(id::text, 5, '0') WHERE tracking_id IS NULL;`);
    
    // For compliance items where id is UUID, we can just use a substring or generate a sequence
    // Let's use a sequence-like approach or random for UUIDs
    await client.query(`UPDATE public.compliance_items SET tracking_id = 'COMP-' || substr(id::text, 1, 8) WHERE tracking_id IS NULL;`);
    
    console.log("Populated tracking_ids.");

    // 3. Add old_values and new_values to audit_ledger
    await client.query(`ALTER TABLE public.audit_ledger ADD COLUMN IF NOT EXISTS old_values JSONB;`);
    await client.query(`ALTER TABLE public.audit_ledger ADD COLUMN IF NOT EXISTS new_values JSONB;`);
    console.log("Updated audit_ledger table.");

  } catch (err) {
    console.error("Error during schema update:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

runSchemaUpdates();
