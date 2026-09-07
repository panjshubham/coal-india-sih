import { Client } from 'pg';
import crypto from 'crypto';

async function seedAuditLedger() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const countRes = await client.query('SELECT count(*) FROM public.audit_ledger');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding initial cryptographic audit ledger entries...');
    
    // Get sample violations
    const violations = await client.query('SELECT id, description, severity, status FROM public.violations ORDER BY id ASC LIMIT 8');
    const users = await client.query('SELECT id FROM public.users LIMIT 2');
    const userId = users.rows[0]?.id || null;

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < violations.rows.length; i++) {
      const v = violations.rows[i];
      const payload = JSON.stringify({ record_id: v.id, severity: v.severity, status: v.status, seq: i });
      const currentHash = crypto.createHash('sha256').update(prevHash + payload).digest('hex');

      await client.query(`
        INSERT INTO public.audit_ledger (table_name, record_id, action, data_hash, prev_hash, user_id, new_values, created_at)
        VALUES ('violations', $1, 'VIOLATION_LOGGED', $2, $3, $4, $5, NOW() - interval '${(violations.rows.length - i) * 3} hours')
      `, [v.id, currentHash, prevHash, userId, JSON.stringify({ severity: v.severity, status: v.status })]);

      prevHash = currentHash;
    }

    // Add inspections
    const inspections = await client.query('SELECT id, type, mine_id FROM public.inspections LIMIT 4');
    for (let i = 0; i < inspections.rows.length; i++) {
      const ins = inspections.rows[i];
      const payload = JSON.stringify({ record_id: ins.id, type: ins.type, mine_id: ins.mine_id });
      const currentHash = crypto.createHash('sha256').update(prevHash + payload).digest('hex');

      await client.query(`
        INSERT INTO public.audit_ledger (table_name, record_id, action, data_hash, prev_hash, user_id, new_values, created_at)
        VALUES ('inspections', $1, 'INSPECTION_COMPLETED', $2, $3, $4, $5, NOW() - interval '${(inspections.rows.length - i) * 2} hours')
      `, [ins.id, currentHash, prevHash, userId, JSON.stringify({ type: ins.type, mine_id: ins.mine_id })]);

      prevHash = currentHash;
    }

    console.log('Seeded audit ledger entries successfully!');
  } else {
    console.log(`Audit ledger already has ${countRes.rows[0].count} entries.`);
  }

  // Also check RLS on audit_ledger
  await client.query(`ALTER TABLE public.audit_ledger ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_ledger' AND policyname = 'Allow read audit_ledger'
      ) THEN
        CREATE POLICY "Allow read audit_ledger" ON public.audit_ledger FOR SELECT TO public USING (true);
      END IF;
    END
    $$;
  `);

  await client.end();
}

seedAuditLedger().catch(console.error);
