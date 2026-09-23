import pg from 'pg';
import { createPgClient } from './dbClient.js';
const { Client } = pg;
const client = createPgClient();
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'");
  console.table(res.rows);
  const views = await client.query("SELECT table_name, view_definition FROM information_schema.views WHERE table_schema = 'public'");
  console.table(views.rows);
  await client.end();
}
run();
