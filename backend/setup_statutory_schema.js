import { Client } from 'pg';

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pkynukxdzwlywrxcwtay',
  password: 'Shubham@123',
  ssl: { rejectUnauthorized: false }
});

async function setupStatutorySchema() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL...');

  const query = `
    CREATE TABLE IF NOT EXISTS public.statutory_registers (
      id SERIAL PRIMARY KEY,
      mine_id INTEGER NOT NULL,
      register_type VARCHAR(60) NOT NULL,
      shift VARCHAR(30) NOT NULL,
      seam_or_pit VARCHAR(100) NOT NULL,
      inspector_name VARCHAR(100) NOT NULL,
      inspector_role VARCHAR(60) NOT NULL,
      parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
      compliance_status VARCHAR(40) NOT NULL DEFAULT 'COMPLIANT',
      statutory_regulation VARCHAR(80) NOT NULL,
      remarks TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      hash VARCHAR(64),
      prev_hash VARCHAR(64),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for fast lookup by mine and register type
    CREATE INDEX IF NOT EXISTS idx_statutory_mine_reg ON public.statutory_registers(mine_id, register_type);
    CREATE INDEX IF NOT EXISTS idx_statutory_created ON public.statutory_registers(created_at DESC);
  `;

  await client.query(query);
  console.log('✅ statutory_registers table and indexes ensured successfully.');

  // Check row count or seed initial demo records if empty
  const countRes = await client.query('SELECT COUNT(*) FROM public.statutory_registers');
  console.log('Current statutory records:', countRes.rows[0].count);

  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding baseline CMR-2017 statutory register entries...');
    const seedQuery = `
      INSERT INTO public.statutory_registers 
      (mine_id, register_type, shift, seam_or_pit, inspector_name, inspector_role, parameters, compliance_status, statutory_regulation, remarks, latitude, longitude, hash)
      VALUES
      (
        1,
        'CMR_153_GAS_TESTING',
        'Morning (06:00 - 14:00)',
        'Seam III - District East Face 4B',
        'Er. Rajesh Kumar',
        'Statutory Gas Testing Officer',
        '{"ch4_pct": 0.45, "co_ppm": 4, "o2_pct": 20.4, "air_velocity_m_s": 1.65, "flame_lamp_check": "passed", "air_quantity_m3_min": 1820}'::jsonb,
        'COMPLIANT',
        'CMR 2017 Reg 153',
        'All ventilation parameters within statutory limits. Return airway clear.',
        23.7923, 86.4253,
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      ),
      (
        1,
        'CMR_129_OVERMAN_DAILY',
        'Morning (06:00 - 14:00)',
        'Incline No. 2 - Main Travelling Roadway',
        'Suresh Patel',
        'Overman (First Class)',
        '{"roof_strata_status": "stable", "wld_supports_intact": true, "dust_suppression_active": true, "water_danger": "none", "flp_electricals_ok": true}'::jsonb,
        'COMPLIANT',
        'CMR 2017 Reg 129',
        'Roadway inspection completed. Hydraulic roof props sound and securely wedged.',
        23.7915, 86.4260,
        'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb'
      ),
      (
        1,
        'CMR_83_HAUL_ROAD',
        'Morning (06:00 - 14:00)',
        'Opencast Bench 3 - Haul Road North',
        'Manoj Singh',
        'Mining Sirdar',
        '{"road_width_m": 24.5, "berm_height_m": 2.2, "dumper_tyre_dia_m": 2.0, "gradient": "1 in 16", "lighting_lux": 45, "water_sprinkling_done": true}'::jsonb,
        'COMPLIANT',
        'CMR 2017 Reg 83',
        'Haul road berm exceeds 1x tyre diameter requirement. Water bowser active for PM10 suppression.',
        23.7930, 86.4240,
        'a495991b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934c'
      );
    `;
    await client.query(seedQuery);
    console.log('✅ Seeded 3 baseline CMR statutory registers.');
  }

  await client.end();
}

setupStatutorySchema().catch(err => {
  console.error('Error creating statutory schema:', err);
  process.exit(1);
});
