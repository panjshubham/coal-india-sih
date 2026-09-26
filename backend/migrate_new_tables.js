import { createPgClient } from './dbClient.js';

const client = createPgClient();

async function migrate() {
  await client.connect();
  console.log('Connected. Creating new tables...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.grievances (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      grievance_id  VARCHAR(30) UNIQUE,
      category      VARCHAR(50) NOT NULL DEFAULT 'other',
      priority      VARCHAR(20) NOT NULL DEFAULT 'medium',
      subject       TEXT NOT NULL,
      description   TEXT NOT NULL,
      submitted_by  VARCHAR(100),
      mine_name     VARCHAR(150),
      anonymous     BOOLEAN DEFAULT false,
      status        VARCHAR(30) NOT NULL DEFAULT 'pending',
      resolution_notes TEXT,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✅ grievances table created (or already exists)');

  await client.query(`ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow all on grievances' AND tablename = 'grievances') THEN
        CREATE POLICY "Allow all on grievances" ON public.grievances FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);
  console.log('✅ grievances RLS configured');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.production_reports (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_date            DATE NOT NULL,
      mine_name              VARCHAR(150) NOT NULL,
      shift                  VARCHAR(5) NOT NULL DEFAULT 'A',
      coal_extracted_mt      NUMERIC(10,2),
      overburden_removed_bcm NUMERIC(12,2),
      active_machines        INTEGER,
      workforce_deployed     INTEGER,
      blasts_conducted       INTEGER DEFAULT 0,
      safety_incidents       INTEGER DEFAULT 0,
      target_mt              NUMERIC(10,2),
      remarks                TEXT,
      submitted_by           VARCHAR(100),
      status                 VARCHAR(20) DEFAULT 'pending',
      created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✅ production_reports table created (or already exists)');

  await client.query(`ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Allow all on production_reports' AND tablename = 'production_reports') THEN
        CREATE POLICY "Allow all on production_reports" ON public.production_reports FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);
  console.log('✅ production_reports RLS configured');

  await client.end();
  console.log('Migration complete!');
}

migrate().catch(e => { console.error(e); client.end(); });
