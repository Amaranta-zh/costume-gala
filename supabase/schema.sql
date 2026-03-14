-- ============================================================
--  Costume Gala — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Guest submissions
CREATE TABLE submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  photo_url   TEXT NOT NULL,
  is_finalist BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Votes (one per fingerprint, enforced at DB level)
CREATE TABLE votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  voter_fingerprint   TEXT NOT NULL,
  voted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT votes_one_per_voter UNIQUE (voter_fingerprint)
);

-- 3. Voting window config (single row, id always = 1)
CREATE TABLE voting_config (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  is_open     BOOLEAN NOT NULL DEFAULT false
);

-- Seed the single config row
INSERT INTO voting_config (id, starts_at, ends_at, is_open)
VALUES (
  1,
  '2025-04-07 18:00:00+07',  -- 6:00 PM Jakarta time (WIB = UTC+7)
  '2025-04-07 20:00:00+07',  -- 8:00 PM Jakarta time
  false
);

-- ============================================================
--  Indexes
-- ============================================================
CREATE INDEX idx_submissions_finalist ON submissions(is_finalist);
CREATE INDEX idx_votes_submission     ON votes(submission_id);

-- ============================================================
--  Vote count view (used by live screen & voting page)
-- ============================================================
CREATE VIEW finalist_vote_counts AS
SELECT
  s.id,
  s.name,
  s.photo_url,
  COUNT(v.id)::INT AS vote_count
FROM submissions s
LEFT JOIN votes v ON v.submission_id = s.id
WHERE s.is_finalist = true
GROUP BY s.id, s.name, s.photo_url
ORDER BY vote_count DESC, s.name ASC;

-- ============================================================
--  Row Level Security (RLS)
-- ============================================================
ALTER TABLE submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_config ENABLE ROW LEVEL SECURITY;

-- Submissions: anyone can INSERT (guest upload); anyone can SELECT finalists
CREATE POLICY "guests can submit"
  ON submissions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anyone can view finalists"
  ON submissions FOR SELECT TO anon
  USING (is_finalist = true OR created_at > now() - interval '1 second'); -- allow immediate post-insert read

-- Votes: anyone can insert (checked by API); anyone can read counts
CREATE POLICY "guests can vote"
  ON votes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "vote counts are public"
  ON votes FOR SELECT TO anon USING (true);

-- Voting config: public read only
CREATE POLICY "config is public"
  ON voting_config FOR SELECT TO anon USING (true);

-- ============================================================
--  Real-time: enable publications for live screen
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE voting_config;
