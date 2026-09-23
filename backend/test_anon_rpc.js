import './dbClient.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testRpc() {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_name: 'Test Public User',
    p_email: 'public_test@coalguard.demo',
    p_password: 'Password123',
    p_role: 'mine_official',
    p_assigned_mine_id: 1
  });
  
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success:', data);
  }
}

testRpc().catch(console.error);
