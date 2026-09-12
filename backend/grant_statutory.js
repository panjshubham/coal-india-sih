import { Client } from 'pg';

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pkynukxdzwlywrxcwtay',
  password: 'Shubham@123',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  await client.query(`
    ALTER TABLE public.statutory_registers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS statutory_allow_all ON public.statutory_registers;
    CREATE POLICY statutory_allow_all ON public.statutory_registers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT ALL ON public.statutory_registers TO anon, authenticated, service_role;
    GRANT USAGE, SELECT ON SEQUENCE public.statutory_registers_id_seq TO anon, authenticated, service_role;
  `);
  console.log('✅ RLS and grants successfully applied on statutory_registers.');
  await client.end();
}

run().catch(console.error);
