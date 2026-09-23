import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createPgClient } from './dbClient.js';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY; // fallback for demo

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setup() {
  const client = createPgClient();
  await client.connect();
  console.log('Connected to PG');

  // 1. Add document_url column
  try {
    await client.query(`
      ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS document_url TEXT;
    `);
    console.log('Added document_url column');
  } catch (e) {
    console.error('Error adding column:', e.message);
  }

  // 2. Setup Storage Bucket via Supabase JS
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error listing buckets:', bucketError);
  } else {
    const bucketExists = buckets.some(b => b.name === 'contractor_documents');
    if (!bucketExists) {
      const { data, error } = await supabase.storage.createBucket('contractor_documents', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
        fileSizeLimit: 5242880 // 5MB
      });
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Created contractor_documents bucket', data);
      }
    } else {
      console.log('contractor_documents bucket already exists');
    }
  }

  // Set RLS for bucket (since it's public we don't strictly need read policies for public URL, but let's allow inserts via SQL)
  try {
    await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('contractor_documents', 'contractor_documents', true) 
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);

    // We can just rely on the API for bucket creation if the above JS fails, but we need RLS on storage.objects
    await client.query(`
      CREATE POLICY "Give public access to contractor_documents" ON storage.objects FOR SELECT USING (bucket_id = 'contractor_documents');
      CREATE POLICY "Allow authenticated uploads to contractor_documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contractor_documents');
      CREATE POLICY "Allow authenticated updates to contractor_documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'contractor_documents');
    `);
    console.log('Set RLS on storage objects');
  } catch (e) {
    console.log('RLS setup note:', e.message);
  }

  // Note: NOTIFY pgrst to reload schema
  await client.query(`NOTIFY pgrst, 'reload schema'`);
  
  await client.end();
}

setup().catch(console.error);
