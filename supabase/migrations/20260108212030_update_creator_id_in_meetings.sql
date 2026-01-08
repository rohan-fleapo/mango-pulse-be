ALTER TABLE meetings
ALTER COLUMN creator_id SET NOT NULL;

ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_creator
FOREIGN KEY (creator_id) REFERENCES users(id)
ON DELETE CASCADE;