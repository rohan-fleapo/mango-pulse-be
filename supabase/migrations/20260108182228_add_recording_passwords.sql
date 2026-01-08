
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_password TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_id UUID;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS zoom_id TEXT;

ALTER TABLE meeting_engagements DROP CONSTRAINT IF EXISTS meeting_engagements_user_email_key;
ALTER TABLE meeting_engagements DROP CONSTRAINT IF EXISTS meeting_engagements_user_email_meeting_id_key;
ALTER TABLE meeting_engagements ADD CONSTRAINT meeting_engagements_user_email_meeting_id_key UNIQUE (user_email, meeting_id);
