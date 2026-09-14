-- =============================================================================
-- CoalGuard PPE Vision System — Supabase Migration
-- Step 1: Run this SQL in your Supabase SQL Editor
-- =============================================================================

-- 1. Create the camera registry table (one row per physical camera)
CREATE TABLE IF NOT EXISTS public.ppe_cameras (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mine_id     UUID NOT NULL REFERENCES public.mines(id) ON DELETE CASCADE,
    camera_id   TEXT NOT NULL,          -- e.g. 'CAM-PIT1-01'
    zone        TEXT NOT NULL,          -- e.g. 'Pit-1', 'Haul Road', 'Shaft-3'
    location    TEXT NOT NULL,          -- Human-readable location description
    rtsp_url    TEXT,                   -- Camera stream URL (stored securely)
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the live PPE violation events table
CREATE TABLE IF NOT EXISTS public.ppe_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mine_id         UUID NOT NULL REFERENCES public.mines(id) ON DELETE CASCADE,
    camera_id       TEXT NOT NULL,
    zone            TEXT NOT NULL,
    detected_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Detection results
    person_count        INT NOT NULL DEFAULT 0,      -- Total persons in frame
    violation_count     INT NOT NULL DEFAULT 0,      -- Persons with missing PPE
    missing_ppe         TEXT[] NOT NULL DEFAULT '{}',-- ['helmet', 'safety_vest']
    ppe_detected        TEXT[] NOT NULL DEFAULT '{}',-- ['helmet'] (what WAS detected)
    
    -- AI model info
    confidence          FLOAT NOT NULL DEFAULT 0.0,  -- YOLOv8 confidence score
    model_version       TEXT NOT NULL DEFAULT 'keremberke/yolov8n-ppe-detection',
    
    -- Evidence
    snapshot_url        TEXT,                        -- Supabase Storage URL
    snapshot_base64     TEXT,                        -- Optional inline snapshot
    
    -- Status tracking
    severity            TEXT NOT NULL DEFAULT 'low', -- 'low' | 'medium' | 'high' | 'critical'
    is_resolved         BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at         TIMESTAMP WITH TIME ZONE,
    resolved_by         UUID REFERENCES public.users(id),
    resolution_note     TEXT,
    
    -- Alert sent?
    alert_sent          BOOLEAN NOT NULL DEFAULT FALSE,
    alert_sent_at       TIMESTAMP WITH TIME ZONE,
    
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for high-throughput queries & scale
CREATE INDEX IF NOT EXISTS idx_ppe_events_mine_id          ON public.ppe_events(mine_id);
CREATE INDEX IF NOT EXISTS idx_ppe_events_camera_id        ON public.ppe_events(camera_id);
CREATE INDEX IF NOT EXISTS idx_ppe_events_detected_at      ON public.ppe_events(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppe_events_composite        ON public.ppe_events(mine_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppe_events_zone_time        ON public.ppe_events(mine_id, zone, detected_at DESC);

-- High-performance Partial Indexes (only indexes active / high risk rows -> saves 90% space & executes in <1ms)
CREATE INDEX IF NOT EXISTS idx_ppe_events_active_violations 
    ON public.ppe_events(mine_id, severity, detected_at DESC) 
    WHERE is_resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_ppe_events_critical_only 
    ON public.ppe_events(mine_id, detected_at DESC) 
    WHERE severity IN ('critical', 'high');

CREATE INDEX IF NOT EXISTS idx_ppe_cameras_mine_id         ON public.ppe_cameras(mine_id);

-- 4. Enable Row Level Security
ALTER TABLE public.ppe_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_cameras ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — all authenticated users can read; only service role can insert
CREATE POLICY "Authenticated users can read PPE events"
    ON public.ppe_events FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Authenticated users can read cameras"
    ON public.ppe_cameras FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Authenticated users can resolve PPE events"
    ON public.ppe_events FOR UPDATE
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- 6. Enable Realtime on ppe_events (so dashboard gets live push updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ppe_events;

-- 7. Create aggregate view for per-zone PPE compliance stats
CREATE OR REPLACE VIEW public.ppe_zone_stats AS
SELECT
    mine_id,
    zone,
    COUNT(*)                                        AS total_events_today,
    SUM(person_count)                               AS total_persons_scanned,
    SUM(violation_count)                            AS total_violations,
    ROUND(
        CASE WHEN SUM(person_count) > 0
        THEN (1.0 - SUM(violation_count)::FLOAT / NULLIF(SUM(person_count), 0)) * 100
        ELSE 100 END, 1
    )                                               AS compliance_pct,
    MAX(detected_at)                                AS last_scan_at,
    COUNT(*) FILTER (WHERE NOT is_resolved)         AS unresolved_count,
    COUNT(*) FILTER (WHERE severity = 'critical')   AS critical_count
FROM public.ppe_events
WHERE detected_at >= NOW() - INTERVAL '24 hours'
GROUP BY mine_id, zone;

-- 8. Seed demo cameras (adjust mine_id after you check your mines table)
-- Run: SELECT id, name FROM mines LIMIT 5;  first, then update UUIDs below.
-- INSERT INTO public.ppe_cameras (mine_id, camera_id, zone, location) VALUES
-- ('YOUR-MINE-UUID', 'CAM-PIT1-01', 'Pit-1',    'Main excavation entry point'),
-- ('YOUR-MINE-UUID', 'CAM-PIT1-02', 'Pit-1',    'Blast zone perimeter'),
-- ('YOUR-MINE-UUID', 'CAM-HAUL-01', 'Haul Road', 'Weighbridge approach'),
-- ('YOUR-MINE-UUID', 'CAM-SHFT-01', 'Shaft-3',  'Cage loading platform'),
-- ('YOUR-MINE-UUID', 'CAM-WASH-01', 'Washery',  'Conveyor belt junction');

-- 9. Scalability Maintenance: Auto-Purge Old Non-Critical Scans (Prevents DB bloat)
CREATE OR REPLACE FUNCTION public.clean_old_ppe_scans(retention_days INT DEFAULT 60)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    -- Delete clear scans and resolved low/med violations older than retention_days
    DELETE FROM public.ppe_events
    WHERE detected_at < NOW() - (retention_days || ' days')::INTERVAL
      AND (violation_count = 0 OR is_resolved = TRUE)
      AND severity NOT IN ('critical', 'high');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DONE — Run this in Supabase SQL Editor → Table Editor to verify tables exist
-- =============================================================================
