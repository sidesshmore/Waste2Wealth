-- RPC helpers called by the FastAPI backend over HTTPS (supabase-py).
-- Run this in Supabase SQL Editor after 001_initial_schema.sql.

-- 1. Insert a report with a PostGIS location and return its id.
CREATE OR REPLACE FUNCTION create_report(
  p_user_id        UUID,
  p_lng            FLOAT,
  p_lat            FLOAT,
  p_photo_url      TEXT,
  p_photo_public_id TEXT,
  p_severity       TEXT,
  p_tags           TEXT[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO reports (user_id, location, photo_url, photo_public_id, severity, cloudinary_tags)
  VALUES (
    p_user_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_photo_url, p_photo_public_id, p_severity, p_tags
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 2. Return open/claimed/pending reports within radius_m metres of a point.
CREATE OR REPLACE FUNCTION get_nearby_reports(
  p_lng      FLOAT,
  p_lat      FLOAT,
  p_radius_m FLOAT DEFAULT 2000
) RETURNS SETOF reports
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM   reports
  WHERE  ST_DWithin(
           location,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
           p_radius_m
         )
    AND  status NOT IN ('verified', 'rejected');
END; $$;

-- 3. Update a user's last_location geography column.
CREATE OR REPLACE FUNCTION update_user_location(
  p_user_id UUID,
  p_lng     FLOAT,
  p_lat     FLOAT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users
  SET    last_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  WHERE  id = p_user_id;
END; $$;

-- 4. Return the distance (metres) from a report's pin to a given point.
CREATE OR REPLACE FUNCTION get_report_distance(
  p_report_id UUID,
  p_lng       FLOAT,
  p_lat       FLOAT
) RETURNS FLOAT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_dist FLOAT;
BEGIN
  SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  INTO   v_dist
  FROM   reports
  WHERE  id = p_report_id;
  RETURN v_dist;
END; $$;

-- Grant execute to the anon/service roles so PostgREST can call them.
GRANT EXECUTE ON FUNCTION create_report TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_nearby_reports TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_location TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_report_distance TO authenticated, service_role;
