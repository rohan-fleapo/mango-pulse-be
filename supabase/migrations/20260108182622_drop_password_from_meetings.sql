-- Drop password column from meetings table
ALTER TABLE meetings DROP COLUMN IF EXISTS password;
