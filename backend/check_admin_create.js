import { Client } from 'pg';
import fs from 'fs';

async function checkProcs() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const procs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as result
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_create_user';
  `);
  console.table(procs.rows);
  
  await client.end();
}

checkProcs().catch(console.error);
