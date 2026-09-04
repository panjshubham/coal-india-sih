import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from frontend
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// WARNING: To insert data, this script needs the SERVICE_ROLE_KEY if RLS is enabled.
// If you only have VITE_SUPABASE_ANON_KEY, you must disable RLS temporarily on the tables, or use the service role key.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mines = [
  { name: 'Jharia Block II', type: 'Opencast', subsidiary: 'BCCL', region: 'Jharkhand', state: 'Jharkhand', latitude: 23.75, longitude: 86.41 },
  { name: 'Gevra OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', latitude: 22.33, longitude: 82.53 },
  { name: 'Kusmunda OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', latitude: 22.33, longitude: 82.60 },
  { name: 'Dipka OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', latitude: 22.32, longitude: 82.55 },
  { name: 'Jayant OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Singrauli', state: 'Madhya Pradesh', latitude: 24.12, longitude: 82.64 },
  { name: 'Dudhichua OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Singrauli', state: 'Madhya Pradesh', latitude: 24.13, longitude: 82.66 },
  { name: 'Nigahi OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Singrauli', state: 'Madhya Pradesh', latitude: 24.11, longitude: 82.60 },
  { name: 'Bhubaneswari OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Talcher', state: 'Odisha', latitude: 20.94, longitude: 85.22 },
  { name: 'Lingaraj OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Talcher', state: 'Odisha', latitude: 20.96, longitude: 85.19 },
  { name: 'Ananta OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Talcher', state: 'Odisha', latitude: 20.97, longitude: 85.17 },
  { name: 'Rajmahal OCP', type: 'Opencast', subsidiary: 'ECL', region: 'Godda', state: 'Jharkhand', latitude: 25.02, longitude: 87.35 },
  { name: 'Ashoka OCP', type: 'Opencast', subsidiary: 'CCL', region: 'Pipawar', state: 'Jharkhand', latitude: 23.71, longitude: 85.03 },
  { name: 'Amrapali OCP', type: 'Opencast', subsidiary: 'CCL', region: 'Chatra', state: 'Jharkhand', latitude: 23.80, longitude: 84.95 },
  { name: 'Magadh OCP', type: 'Opencast', subsidiary: 'CCL', region: 'Chatra', state: 'Jharkhand', latitude: 23.82, longitude: 84.90 },
  { name: 'PKC OCP', type: 'Opencast', subsidiary: 'SCCL', region: 'Manuguru', state: 'Telangana', latitude: 17.96, longitude: 80.75 },
  { name: 'RG OC 1', type: 'Opencast', subsidiary: 'SCCL', region: 'Ramagundam', state: 'Telangana', latitude: 18.73, longitude: 79.51 },
  { name: 'JVR OC 2', type: 'Opencast', subsidiary: 'SCCL', region: 'Sathupalli', state: 'Telangana', latitude: 17.21, longitude: 80.82 },
  { name: 'Samaleswari OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Ib Valley', state: 'Odisha', latitude: 21.82, longitude: 83.92 },
];

async function seed() {
  console.log('Seeding mines...');
  const { data: insertedMines, error: mineError } = await supabase.from('mines').insert(mines).select();
  if (mineError) {
    console.error('Error inserting mines:', mineError);
    return;
  }
  
  // Choose 3 mines for deliberate repeating violations
  const problemMines = insertedMines.slice(0, 3);
  
  // Seed contractors
  const contractors = [
    { name: 'Alpha Mining Services', mine_id: insertedMines[0].id, contract_start: '2025-01-01', contract_end: '2027-01-01' },
    { name: 'Beta Earthmovers', mine_id: insertedMines[1].id, contract_start: '2024-06-01', contract_end: '2026-06-01' },
    { name: 'Gamma Logistics', mine_id: insertedMines[2].id, contract_start: '2025-03-01', contract_end: '2028-03-01' },
    { name: 'Delta Drilling Co.', mine_id: insertedMines[3].id, contract_start: '2023-11-01', contract_end: '2026-11-01' },
    { name: 'Epsilon Safety Solutions', mine_id: insertedMines[4].id, contract_start: '2025-02-01', contract_end: '2026-02-01' },
  ];
  await supabase.from('contractors').insert(contractors);

  console.log('Seeding compliance items and violations...');
  for (let i = 0; i < 80; i++) {
    const mine = insertedMines[i % insertedMines.length];
    const isProblemMine = problemMines.find(m => m.id === mine.id);
    
    // Create compliance item
    await supabase.from('compliance_items').insert({
      mine_id: mine.id,
      category: 'safety',
      title: `Safety Check ${i}`,
      due_date: new Date(Date.now() + (Math.random() * 30 - 15) * 86400000).toISOString().split('T')[0],
      status: Math.random() > 0.5 ? 'pending' : (Math.random() > 0.5 ? 'overdue' : 'submitted')
    });
  }

  // Create violations for problem mines (3+ same category)
  for (const mine of problemMines) {
    for(let j=0; j<4; j++) {
       await supabase.from('violations').insert({
          mine_id: mine.id,
          category: 'safety',
          severity: 'high',
          description: 'Repeated safety gear absence in sector A.',
          latitude: mine.latitude,
          longitude: mine.longitude,
          status: 'open',
          timestamp: new Date(Date.now() - (j * 10 * 86400000)).toISOString()
       });
    }
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
