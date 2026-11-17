ALTER TABLE messages ADD COLUMN slot_id uuid;
ALTER TABLE messages ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE messages ADD COLUMN is_current boolean NOT NULL DEFAULT true;
CREATE INDEX idx_messages_slot ON messages(slot_id);
ALTER TABLE profile ADD COLUMN keepalive_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE profile ADD COLUMN notify_enabled boolean NOT NULL DEFAULT false;