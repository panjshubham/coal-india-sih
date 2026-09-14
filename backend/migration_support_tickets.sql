-- Migration: Create support_tickets table

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admin and Regulator roles can view all tickets
CREATE POLICY "Admins and Regulators can view all tickets"
ON support_tickets
FOR SELECT
USING (
  (SELECT role FROM auth.users WHERE auth.users.id = auth.uid()) IN ('corporate', 'regulator') OR
  -- Assuming role is also stored in metadata or we check the role column of the user
  current_setting('request.jwt.claims', true)::json->>'role' IN ('corporate', 'regulator')
);

-- Since auth.users role check can be tricky in raw SQL if they use custom claims, 
-- a safer way if the app passes the role:
-- We can allow read if the user's role in the DB is corporate/regulator, OR if we trust the client to just fetch all if they have the role. 
-- For simplicity, let's just use a simpler policy if the app's standard is to check custom claims:
-- (Supabase often uses auth.jwt()->>'role', but let's fall back to a simpler check on the ticket's role, wait no, the ticket's role is the submitter's role).
-- Actually, let's create a secure policy for admins based on the user's auth metadata if possible, or just allow read if they are authenticated and we handle filtering in the app (though less secure). 
-- Since the user specified: "Admin/Regulator roles can read/update all tickets", let's assume the auth role is in `auth.users.raw_user_meta_data->>'role'`.

DROP POLICY IF EXISTS "Admins and Regulators can view all tickets" ON support_tickets;
CREATE POLICY "Admins and Regulators can view all tickets"
ON support_tickets
FOR SELECT
USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('corporate', 'regulator')
);

-- Policy: Users can insert their own tickets
CREATE POLICY "Users can insert their own tickets"
ON support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins and Regulators can update tickets (e.g. status)
CREATE POLICY "Admins and Regulators can update tickets"
ON support_tickets
FOR UPDATE
USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('corporate', 'regulator')
);

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
