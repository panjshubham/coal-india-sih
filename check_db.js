import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pkynukxdzwlywrxcwtay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE';
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
