import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function testLandingQueries() {
  const { count: minesCount } = await supabase.from('mines').select('*', { count: 'exact', head: true });
  const { count: activeViolationsCount } = await supabase.from('violations').select('*', { count: 'exact', head: true }).eq('status', 'open');
  const { data: latestV } = await supabase.from('violations').select('created_at').order('created_at', { ascending: false }).limit(1);
  const { data: sampleGps } = await supabase.from('violations').select('id, latitude, longitude, created_at, category, severity').not('latitude', 'is', null).order('created_at', { ascending: false }).limit(1);
  const { data: topRisk } = await supabase.from('risk_scores').select('score, risk_level, explanation, contributing_factors, mines(name, subsidiary)').order('score', { ascending: false }).limit(1);
  const { count: alertsCount } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_read', false);
  const { count: auditLogsCount, data: auditRows } = await supabase.from('audit_ledger').select('data_hash', { count: 'exact' }).order('id', { ascending: false }).limit(1);

  console.log('Mines Count:', minesCount);
  console.log('Active Violations:', activeViolationsCount);
  console.log('Latest Violation Timestamp:', latestV?.[0]?.created_at);
  console.log('Sample GPS Record:', sampleGps?.[0]);
  console.log('Top Risk Record:', topRisk?.[0]);
  console.log('Active Alerts Count:', alertsCount);
  console.log('Audit Logs Count:', auditLogsCount);
  console.log('Latest Block Hash:', auditRows?.[0]?.data_hash);
}

testLandingQueries().catch(console.error);
