-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- --------------------------------------------------
-- ENUM: user_role
-- --------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'coach');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------
-- USERS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email CITEXT NOT NULL,
    password TEXT NOT NULL,
    tag_mango_id VARCHAR(255),
    roles user_role[] NOT NULL DEFAULT ARRAY['user']::user_role[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_auth_fk
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

-- --------------------------------------------------
-- INDEXES
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_tag_mango_id
    ON public.users(tag_mango_id)
    WHERE tag_mango_id IS NOT NULL;

-- For role lookups: WHERE 'coach' = ANY(roles)
CREATE INDEX IF NOT EXISTS idx_users_roles
    ON public.users
    USING GIN (roles);

-- --------------------------------------------------
-- UPDATED_AT TRIGGER
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 🔒 Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 🔒 Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 🔒 Users can insert their own row (on signup hooks)
CREATE POLICY "Users can insert self"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ❌ No delete access from client
-- (Handled via service role only)

-- --------------------------------------------------
-- COMMENTS
-- --------------------------------------------------
COMMENT ON TABLE public.users IS 'MangoPulse user accounts for coaches and students';
COMMENT ON COLUMN public.users.tag_mango_id IS 'Optional TagMango platform integration ID';
COMMENT ON COLUMN public.users.roles IS 'User roles array: user, coach';
