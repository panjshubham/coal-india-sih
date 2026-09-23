/**
 * backend/dbClient.js — single source of truth for Postgres connections.
 *
 * SECURITY: database credentials must never live in source code.
 * Put the connection string in backend/.env (git-ignored):
 *
 *   DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres
 *
 * See backend/.env.example.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env explicitly (works regardless of the shell's cwd)
dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

export const PG_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  // Supabase requires TLS; their pooler/DB certificates are not in the
  // Node trust store, so verification is disabled — acceptable for these
  // local maintenance scripts talking to a managed Supabase instance.
  ssl: { rejectUnauthorized: false },
};

/**
 * Creates an unconnected pg Client configured from DATABASE_URL.
 * Throws early with a helpful message when the env var is missing.
 */
export function createPgClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Create backend/.env from backend/.env.example ' +
      'and add your Supabase connection string (Settings → Database → Connection string).'
    );
  }
  return new Client(PG_CONFIG);
}

export default createPgClient;
