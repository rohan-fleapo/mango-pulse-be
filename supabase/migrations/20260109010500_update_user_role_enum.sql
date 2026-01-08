

BEGIN;

ALTER TABLE users 
  ALTER COLUMN role TYPE text;


DROP TYPE user_role;


CREATE TYPE user_role AS ENUM ('member', 'creator');


UPDATE users 
SET role = 'member' 
WHERE role NOT IN ('member', 'creator');


ALTER TABLE users 
  ALTER COLUMN role TYPE user_role 
  USING role::user_role;

COMMIT;
