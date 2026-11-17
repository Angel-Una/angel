ALTER TABLE chat_settings ADD COLUMN persona_text text;
ALTER TABLE chat_settings ADD COLUMN worldview_text text;
ALTER TABLE profile ADD COLUMN context_limit integer NOT NULL DEFAULT 20;