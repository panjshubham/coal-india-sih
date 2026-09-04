import { Client } from 'pg';

const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });

async function runSchemaUpdates() {
  try {
    await client.connect();
    console.log("Connected to database. Running schema updates...");

    // Violations missing columns
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS approved_by UUID;`);
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;`);
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS category TEXT;`);
    console.log("Updated violations table.");

    // Risk scores missing columns
    await client.query(`ALTER TABLE public.risk_scores ADD COLUMN IF NOT EXISTS explanation TEXT;`);
    await client.query(`ALTER TABLE public.risk_scores ADD COLUMN IF NOT EXISTS contributing_factors JSONB;`);
    console.log("Updated risk_scores table.");

    // Audit ledger missing columns
    await client.query(`ALTER TABLE public.audit_ledger ADD COLUMN IF NOT EXISTS user_id UUID;`);
    console.log("Updated audit_ledger table.");

    // Create missing compliance_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.compliance_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mine_id INTEGER NOT NULL REFERENCES public.mines(id),
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          due_date DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          assigned_to UUID,
          document_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created compliance_items table.");

    // Create missing contractor_incidents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.contractor_incidents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contractor_id INTEGER NOT NULL REFERENCES public.contractors(id),
          violation_id INTEGER REFERENCES public.violations(id),
          severity TEXT NOT NULL,
          date DATE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created contractor_incidents table.");

  } catch (err) {
    console.error("Error during schema update:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

runSchemaUpdates();
