-- Add subscription fields to users table
ALTER TABLE users 
ADD COLUMN is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN subscription_id TEXT,
ADD COLUMN razorpay_customer_id TEXT;
