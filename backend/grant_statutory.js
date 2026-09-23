import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

const client = createPgClient();

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
