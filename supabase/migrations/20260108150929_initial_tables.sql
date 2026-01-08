CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('member', 'creator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_interest AS ENUM ('yes', 'no', 'maybe', 'no-response');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  tag_mango_id UUID,
  role user_role NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT users_creator_email_unique UNIQUE (creator_id, email)
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link TEXT NOT NULL,
  recording_link TEXT,
  start_date TIMESTAMP NOT NULL,
  scheduled_end_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  send_not_interested BOOLEAN DEFAULT false,
  invite_sent_at TIMESTAMP,
  notify_before_mins INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meeting_id UUID NOT NULL,
  joining_time TIMESTAMP NOT NULL,
  leaving_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meeting_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL UNIQUE,
  meeting_id UUID NOT NULL,
  interested meeting_interest DEFAULT 'no-response',
  attended BOOLEAN DEFAULT false,
  cycle INT DEFAULT 1,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_engagement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_engagement_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meeting_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  next_meeting_interested meeting_interest DEFAULT 'no-response',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY users_update ON users FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY users_delete ON users FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY meetings_select ON meetings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY meetings_insert ON meetings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY meetings_update ON meetings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY meetings_delete ON meetings FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY meeting_activities_select ON meeting_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY meeting_activities_insert ON meeting_activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY meeting_activities_update ON meeting_activities FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY meeting_activities_delete ON meeting_activities FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY meeting_engagements_select ON meeting_engagements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY meeting_engagements_insert ON meeting_engagements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY meeting_engagements_update ON meeting_engagements FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY meeting_engagements_delete ON meeting_engagements FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY meeting_feedbacks_select ON meeting_feedbacks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY meeting_feedbacks_insert ON meeting_feedbacks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY meeting_feedbacks_update ON meeting_feedbacks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY meeting_feedbacks_delete ON meeting_feedbacks FOR DELETE USING (auth.role() = 'authenticated');
