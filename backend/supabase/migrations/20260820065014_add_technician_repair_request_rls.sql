-- ============================================================
-- RLS: Technicians can only view assigned repair requests
-- ============================================================

ALTER TABLE public.repair_requests
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
    "repair_requests_technician_select_assigned"
ON public.repair_requests;

CREATE POLICY
    "repair_requests_technician_select_assigned"
ON public.repair_requests
FOR SELECT
TO authenticated
USING (
    technician_id = (SELECT auth.jwt() ->> 'sub')
);