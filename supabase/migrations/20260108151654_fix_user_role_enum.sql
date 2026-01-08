-- Add new values to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'creator';
