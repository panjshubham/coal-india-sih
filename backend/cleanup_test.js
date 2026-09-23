import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function cleanupTest() {
  const client = createPgClient();

  await client.connect();

  await client.query(`DELETE FROM public.users WHERE email LIKE 'test_engineer_%';`);
  await client.query(`DELETE FROM auth.identities WHERE email LIKE 'test_engineer_%';`);
  await client.query(`DELETE FROM auth.users WHERE email LIKE 'test_engineer_%';`);

  console.log('Cleaned up test user!');
  await client.end();
}

cleanupTest().catch(console.error);
