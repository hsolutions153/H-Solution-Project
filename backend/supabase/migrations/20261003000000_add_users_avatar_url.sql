-- Profile photo URL for users (customers upload it from the User-app profile screen).
-- The column already exists on the hosted project; IF NOT EXISTS keeps local resets in sync.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
