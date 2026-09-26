import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

const client = createPgClient();

async function runSchemaUpdates() {
  try {
    await client.connect();
    console.log("Connected to database. Running workflow schema updates...");

    // 1. Create Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read_status BOOLEAN DEFAULT false,
        action_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created notifications table.");

    // 2. Enable Row Level Security (RLS) for notifications
    await client.query(`ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`);
    // Create policy for users to see only their own notifications
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE policyname = 'Users can view their own notifications' AND tablename = 'notifications'
        ) THEN
          CREATE POLICY "Users can view their own notifications" ON public.notifications
          FOR SELECT
          USING (auth.uid() = user_id);
        END IF;
      END
      $$;
    `);

    // 3. Add escalation columns to violations/hazards tables
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(50) DEFAULT 'Pit Inspector';`);
    await client.query(`ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS escalation_deadline TIMESTAMP WITH TIME ZONE;`);
    console.log("Added escalation columns to violations.");

  } catch (err) {
    console.error("Error during schema update:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

runSchemaUpdates();
