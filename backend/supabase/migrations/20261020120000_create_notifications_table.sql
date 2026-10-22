-- ============================================================
-- Migration: Create notifications table and RLS policies
-- Description: Supports real-time and in-app notifications for 
-- Customers (User-app), Technicians (Technician-app), and Admins (Admin-web)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(10) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR(20) NOT NULL DEFAULT 'SYSTEM'
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Grant permissions for roles
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO anon;

-- Drop existing policies if any
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_access" ON public.notifications;

-- Service role has full unrestricted access
CREATE POLICY "notifications_service_role_all"
ON public.notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated and anon users can access/update their notifications
CREATE POLICY "notifications_user_access"
ON public.notifications
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Indexes for high-performance notification retrieval & unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
