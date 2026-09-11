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
    SELECT p.proname, p.prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
  `);
  fs.writeFileSync('procs.json', JSON.stringify(procs.rows, null, 2));
  
  await client.end();
}

checkProcs().catch(console.error);
