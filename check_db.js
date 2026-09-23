import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['mines', 'violations', 'compliance_items', 'inspections', 'risk_scores', 'users'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}' error:`, error.message);
    } else {
      console.log(`Table '${table}' exists! Columns:`, data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data yet');
    }
  }
}

checkTables();
