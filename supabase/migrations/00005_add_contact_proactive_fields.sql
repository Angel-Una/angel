ALTER TABLE contacts
  ADD COLUMN proactive_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN proactive_min_minutes int NOT NULL DEFAULT 5,
  ADD COLUMN proactive_max_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN next_proactive_at timestamptz;