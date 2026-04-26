-- 003_litter_metadata.sql
-- Run in Supabase SQL Editor after 002_rpc_functions.sql
-- Adds OpenLitterMap-style litter metadata to reports

-- ── 1. New columns on reports ──────────────────────────────────────────────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS lat             FLOAT,        -- denormalized for fast frontend GeoJSON
  ADD COLUMN IF NOT EXISTS lng             FLOAT,
  ADD COLUMN IF NOT EXISTS address         TEXT,         -- reverse-geocoded human address
  ADD COLUMN IF NOT EXISTS litter_category TEXT,         -- smoking | food | softDrinks | alcohol | coffee | brands | sanitary | other | dumping
  ADD COLUMN IF NOT EXISTS litter_type     TEXT,         -- camelCase sub-type: butts | packaging | plasticBags | soda_can ...
  ADD COLUMN IF NOT EXISTS object_type     TEXT,         -- human label: "Cigarette Butt", "Aluminum Can" ...
  ADD COLUMN IF NOT EXISTS materials       TEXT[] DEFAULT '{}',  -- plastic | paper | aluminium | cardboard | glass | organic | rubber | metal | fabric
  ADD COLUMN IF NOT EXISTS brand           TEXT,         -- brand name if visible, NULL otherwise
  ADD COLUMN IF NOT EXISTS item_condition  TEXT[] DEFAULT '{}',  -- intact | crushed | torn | weathered | stained | burnt | broken | wet
  ADD COLUMN IF NOT EXISTS item_count      INTEGER DEFAULT 1;    -- estimated number of litter items visible

-- ── 2. Indexes for analytics + filtering ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_litter_category ON reports(litter_category) WHERE litter_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_brand           ON reports(brand)            WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_materials       ON reports USING GIN(materials);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng         ON reports(lat, lng)         WHERE lat IS NOT NULL;

-- ── 3. Update create_report RPC to store lat/lng + address ────────────────────
-- Drop the old 7-param overload from 002_rpc_functions.sql before replacing
DROP FUNCTION IF EXISTS create_report(uuid, float, float, text, text, text, text[]);

CREATE OR REPLACE FUNCTION create_report(
  p_user_id         UUID,
  p_lng             FLOAT,
  p_lat             FLOAT,
  p_photo_url       TEXT,
  p_photo_public_id TEXT,
  p_severity        TEXT,
  p_tags            TEXT[],
  p_address         TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO reports (
    user_id, location, lat, lng,
    photo_url, photo_public_id, severity, cloudinary_tags, address
  )
  VALUES (
    p_user_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_lat, p_lng,
    p_photo_url, p_photo_public_id, p_severity, p_tags, p_address
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION create_report(uuid, float, float, text, text, text, text[], text)
  TO anon, authenticated, service_role;

-- ── 4. Litter stats view (for gallery header + city stats) ────────────────────
CREATE OR REPLACE VIEW litter_stats AS
SELECT
  litter_category,
  litter_type,
  COUNT(*)                                                                    AS count,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)             AS pct_total,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY litter_category), 0), 1) AS pct_in_category
FROM reports
WHERE litter_type IS NOT NULL
GROUP BY litter_category, litter_type
ORDER BY count DESC;

CREATE OR REPLACE VIEW material_stats AS
SELECT
  material,
  COUNT(*)                                                         AS count,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)  AS pct
FROM reports, UNNEST(materials) AS material
GROUP BY material
ORDER BY count DESC;

CREATE OR REPLACE VIEW brand_stats AS
SELECT
  brand,
  COUNT(*) AS count
FROM reports
WHERE brand IS NOT NULL
GROUP BY brand
ORDER BY count DESC
LIMIT 20;

GRANT SELECT ON litter_stats  TO anon, authenticated;
GRANT SELECT ON material_stats TO anon, authenticated;
GRANT SELECT ON brand_stats    TO anon, authenticated;
