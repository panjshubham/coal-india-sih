import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = fs.readFileSync(path.join(__dirname, '../frontend/.env'), 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k) acc[k.trim()] = v?.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('violations').insert({
    mine_id: 1,
    regulation_ref: 'CMR 2017/108',
    severity: 'critical',
    description: 'System alert test critical violation ' + Date.now(),
    status: 'open'
  }).select();
  
  if (error) {
    console.error('Error inserting violation:', error);
  } else {
    console.log('Inserted violation:', data[0].id);
  }
}
test();
