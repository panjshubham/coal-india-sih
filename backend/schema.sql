-- Supabase Schema for CoalGuard

-- 1. Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('mine_official', 'corporate', 'regulator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_category AS ENUM ('safety', 'environment', 'production', 'labour');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_status AS ENUM ('pending', 'submitted', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE violation_status AS ENUM ('open', 'in_progress', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables

CREATE TABLE IF NOT EXISTS public.mines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subsidiary TEXT NOT NULL,
    region TEXT NOT NULL,
    state TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'mine_official',
    assigned_mine_id UUID REFERENCES public.mines(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compliance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mine_id UUID NOT NULL REFERENCES public.mines(id),
    category compliance_category NOT NULL,
    title TEXT NOT NULL,
    due_date DATE NOT NULL,
    status compliance_status NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES public.users(id),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mine_id UUID NOT NULL REFERENCES public.mines(id),
    inspector_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES public.inspections(id),
    mine_id UUID NOT NULL REFERENCES public.mines(id),
    category compliance_category NOT NULL,
    severity severity_level NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status violation_status NOT NULL DEFAULT 'open',
    corrective_action TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mine_id UUID NOT NULL REFERENCES public.mines(id),
    contract_start DATE NOT NULL,
    contract_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contractor_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id),
    violation_id UUID REFERENCES public.violations(id),
    severity severity_level NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    related_entity_id UUID NOT NULL,
    message TEXT NOT NULL,
    severity severity_level NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    prev_hash TEXT,
    hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.risk_scores (
    mine_id UUID PRIMARY KEY REFERENCES public.mines(id),
    score DOUBLE PRECISION NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contributing_factors JSONB NOT NULL
);

-- 3. Row Level Security

ALTER TABLE public.mines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are highly dependent on the auth setup. 
-- The following are very permissive for development.

CREATE POLICY "Allow authenticated read access" ON public.mines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow anon read access" ON public.mines FOR SELECT USING (true);
CREATE POLICY "Allow all read access" ON public.violations FOR SELECT USING (true);
-- Add other policies as needed.
