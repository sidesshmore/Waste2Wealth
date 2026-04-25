-- ─────────────────────────────────────────────────────────────────────────────
-- Waste2Wealth — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;


-- ─── Users ───────────────────────────────────────────────────────────────────
-- id = Supabase auth.users UUID (set at Google login via /users/sync)
-- world_id_nullifier is NULL until user verifies to vote (not required for login)

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY,
  email               TEXT,
  world_id_nullifier  TEXT UNIQUE,
  wallet_address      TEXT,
  reputation          INTEGER DEFAULT 100,
  sol_earned          NUMERIC(10,4) DEFAULT 0,
  push_token          TEXT,
  last_location       GEOGRAPHY(POINT, 4326),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_last_location_idx ON users USING GIST(last_location);


-- ─── Reports ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url         TEXT NOT NULL,
  photo_public_id   TEXT NOT NULL,
  severity          TEXT CHECK (severity IN ('Minor','Moderate','Major')),
  description       TEXT,
  cloudinary_tags   TEXT[] DEFAULT '{}',
  vision_transcript JSONB,
  status            TEXT DEFAULT 'open' CHECK (
    status IN ('open','claimed','cleaning','pending_verification','verified','rejected','flagged')
  ),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_location_idx  ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS reports_status_idx    ON reports (status);


-- ─── Cleanups ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cleanups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES reports(id),
  cleaner_id        UUID REFERENCES users(id),
  before_url        TEXT,
  before_public_id  TEXT,
  after_url         TEXT,
  after_public_id   TEXT,
  vision_transcript JSONB,
  status            TEXT DEFAULT 'claimed' CHECK (
    status IN ('claimed','submitted','pending_verification','confirmed','rejected')
  ),
  claimed_at        TIMESTAMPTZ DEFAULT now(),
  submitted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cleanups_status_idx ON cleanups (status);


-- ─── Votes ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_id  UUID REFERENCES cleanups(id),
  voter_id    UUID REFERENCES users(id),
  vote        BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cleanup_id, voter_id)
);


-- ─── Transactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  amount_sol    NUMERIC(10,4) NOT NULL,
  type          TEXT CHECK (type IN ('reporter','cleaner','verifier')),
  tx_signature  TEXT,
  cleanup_id    UUID REFERENCES cleanups(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- All writes go through FastAPI using the service-role key (bypasses RLS).
-- Mobile app uses the anon key — read-only access to public data.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Public read (required for Supabase Realtime to deliver events to anon clients)
CREATE POLICY "public read reports"      ON reports      FOR SELECT USING (true);
CREATE POLICY "public read cleanups"     ON cleanups     FOR SELECT USING (true);
CREATE POLICY "public read votes"        ON votes        FOR SELECT USING (true);
CREATE POLICY "public read transactions" ON transactions FOR SELECT USING (true);

-- Users: each user can only read their own row
CREATE POLICY "users read self" ON users FOR SELECT USING (auth.uid() = id);


-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Adds reports and cleanups to the supabase_realtime publication so the mobile
-- app receives live pin updates and verify-screen badge counts.

ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE cleanups;
