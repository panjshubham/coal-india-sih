import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPgClient } from './dbClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = fs.readFileSync(path.join(__dirname, '../frontend/.env'), 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k) acc[k.trim()] = v?.trim();
  return acc;
}, {});

const client = createPgClient();
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'violations'"))
  .then(res => console.log(res.rows.map(r => r.column_name)))
  .catch(console.error)
  .finally(() => client.end());
