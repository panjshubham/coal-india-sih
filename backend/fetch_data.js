import { createPgClient } from './dbClient.js';
const c = createPgClient();
await c.connect();

// 1. Get mines columns first
const mCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='mines' ORDER BY ordinal_position");
console.log('MINES COLUMNS:', mCols.rows.map(r=>r.column_name).join(', '));

// 2. Get mines data
const mines = await c.query('SELECT * FROM public.mines LIMIT 15');
console.log('MINES DATA:', JSON.stringify(mines.rows, null, 2));

// 3. Get violations columns
const vCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='violations' ORDER BY ordinal_position");
console.log('VIOLATIONS COLUMNS:', vCols.rows.map(r=>r.column_name).join(', '));

// 4. Get violations (no location)
const viol = await c.query(`SELECT v.id, v.severity, v.category, v.description, m.name as mine_name FROM public.violations v LEFT JOIN public.mines m ON v.mine_id=m.id ORDER BY v.created_at DESC LIMIT 10`);
console.log('VIOLATIONS:', JSON.stringify(viol.rows, null, 2));

// 5. Compliance
try {
  const compCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='compliance_items' ORDER BY ordinal_position");
  console.log('COMPLIANCE COLUMNS:', compCols.rows.map(r=>r.column_name).join(', '));
  const comp = await c.query("SELECT * FROM public.compliance_items WHERE status != 'completed' LIMIT 5");
  console.log('COMPLIANCE:', JSON.stringify(comp.rows, null, 2));
} catch(e) { console.log('compliance error:', e.message); }

// 6. Users
try {
  const uCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position");
  console.log('USERS COLUMNS:', uCols.rows.map(r=>r.column_name).join(', '));
  const users = await c.query("SELECT * FROM public.users LIMIT 8");
  console.log('USERS:', JSON.stringify(users.rows, null, 2));
} catch(e) { console.log('users error:', e.message); }

await c.end();
