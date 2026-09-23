/**
 * backend/dbClient.cjs — CommonJS twin of dbClient.js for the .cjs maintenance scripts.
 *
 * SECURITY: credentials live in backend/.env (git-ignored), never in source code.
 */
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Load backend/.env explicitly (works regardless of the shell's cwd)
dotenv.config({ path: path.join(__dirname, '.env') });

const PG_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

function createPgClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Create backend/.env from backend/.env.example ' +
      'and add your Supabase connection string (Settings → Database → Connection string).'
    );
  }
  return new Client(PG_CONFIG);
}

module.exports = { createPgClient, PG_CONFIG };
