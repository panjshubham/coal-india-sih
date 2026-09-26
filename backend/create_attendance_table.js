import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const createTableSql = `
CREATE TABLE IF NOT EXISTS public.attendance (
  id BIGSERIAL PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  worker_name VARCHAR(255) NOT NULL,
  designation VARCHAR(128) NOT NULL,
  shift VARCHAR(64) NOT NULL DEFAULT 'Morning (Shift 1)',
  mine_id INTEGER REFERENCES public.mines(id) ON DELETE SET NULL,
  contractor_id INTEGER REFERENCES public.contractors(id) ON DELETE SET NULL,
  contractor_name VARCHAR(255),
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  accuracy_meters NUMERIC(6, 2) DEFAULT 2.4,
  status VARCHAR(32) DEFAULT 'present',
  verification_method VARCHAR(64) DEFAULT 'geo_fenced_gate',
  photo_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and create permissive policies
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow public read access on attendance'
  ) THEN
    CREATE POLICY "Allow public read access on attendance" ON public.attendance FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow public insert access on attendance'
  ) THEN
    CREATE POLICY "Allow public insert access on attendance" ON public.attendance FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow public update access on attendance'
  ) THEN
    CREATE POLICY "Allow public update access on attendance" ON public.attendance FOR UPDATE USING (true);
  END IF;
END
$$;

-- Seed initial records if empty
INSERT INTO public.attendance (worker_id, worker_name, designation, shift, mine_id, contractor_id, contractor_name, latitude, longitude, status, verification_method, timestamp)
SELECT 'CIL-W-1042', 'Ramesh Soren', 'Senior Excavator Operator', 'Morning (Shift 1)', 42, 9, 'L&T Mining Services', 23.7923, 86.4253, 'present', 'face_biometric', NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM public.attendance LIMIT 1);

INSERT INTO public.attendance (worker_id, worker_name, designation, shift, mine_id, contractor_id, contractor_name, latitude, longitude, status, verification_method, timestamp)
SELECT 'CIL-W-1088', 'Birsa Munda', 'Heavy Dumper Operator', 'Morning (Shift 1)', 42, 13, 'Adani Mining Ent', 23.7924, 86.4255, 'present', 'geo_fenced_gate', NOW() - INTERVAL '1 hour 45 minutes'
WHERE (SELECT COUNT(*) FROM public.attendance) < 2;

INSERT INTO public.attendance (worker_id, worker_name, designation, shift, mine_id, contractor_id, contractor_name, latitude, longitude, status, verification_method, timestamp)
SELECT 'CIL-W-1120', 'Sunil Hansda', 'DGMS Certified Blaster', 'Morning (Shift 1)', 42, 10, 'BGR Mining & Infra', 23.7921, 86.4251, 'present', 'face_biometric', NOW() - INTERVAL '1 hour 20 minutes'
WHERE (SELECT COUNT(*) FROM public.attendance) < 3;
`;

async function main() {
  try {
    await pool.query(createTableSql);
    console.log('✅ public.attendance table successfully created in Supabase PostgreSQL!');
    const res = await pool.query('SELECT count(*) FROM public.attendance;');
    console.log('Total attendance rows:', res.rows[0].count);
    const rows = await pool.query('SELECT worker_id, worker_name, shift, contractor_name FROM public.attendance LIMIT 5;');
    console.log('Sample rows:', rows.rows);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
