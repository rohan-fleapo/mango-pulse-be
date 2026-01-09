-- Add is_onboarded column to users table
ALTER TABLE users ADD COLUMN is_onboarded BOOLEAN DEFAULT false;

-- Update existing users to have is_onboarded = false
UPDATE users SET is_onboarded = false WHERE is_onboarded IS NULL;
