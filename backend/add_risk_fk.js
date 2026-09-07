import { Client } from 'pg';

async function addRiskFk() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // Delete obsolete mine_ids that don't exist in mines
  await client.query(`DELETE FROM public.risk_scores WHERE mine_id NOT IN (SELECT id FROM public.mines);`);

  // Add FK constraint if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_risk_scores_mine'
      ) THEN
        ALTER TABLE public.risk_scores 
        ADD CONSTRAINT fk_risk_scores_mine 
        FOREIGN KEY (mine_id) REFERENCES public.mines(id) ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);

  // Ensure RLS policy exists for read on risk_scores
  await client.query(`ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'risk_scores' AND policyname = 'Allow read risk_scores'
      ) THEN
        CREATE POLICY "Allow read risk_scores" ON public.risk_scores FOR SELECT TO public USING (true);
      END IF;
    END
    $$;
  `);

  console.log('✅ Added fk_risk_scores_mine and RLS policy!');
  await client.end();
}

addRiskFk().catch(console.error);
