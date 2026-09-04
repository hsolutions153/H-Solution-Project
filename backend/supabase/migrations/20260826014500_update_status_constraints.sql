-- Migration: Update check constraints to support full workflow statuses
-- This adds the new workflow states that were added to the backend models
-- but were missing from the database constraints.

-- 1. Update issue_type constraint to include all frontend issue types
ALTER TABLE public.repair_requests DROP CONSTRAINT IF EXISTS chk_issue_type;
ALTER TABLE public.repair_requests ADD CONSTRAINT chk_issue_type
  CHECK (issue_type IN ('BATTERY','MOTOR','TIRE','BRAKE','CONTROLLER','WHEEL','FRAME','OTHER','GENERAL'));

-- 2. Update repair_requests status constraint to include all workflow states
ALTER TABLE public.repair_requests DROP CONSTRAINT IF EXISTS chk_repair_status;
ALTER TABLE public.repair_requests ADD CONSTRAINT chk_repair_status
  CHECK (status IN (
    'PENDING','REQUESTED','CONFIRMED',
    'ASSIGNED','ACCEPTED','REJECTED',
    'EN_ROUTE','ARRIVED',
    'DIAGNOSING','DIAGNOSED',
    'ESTIMATE_SUBMITTED','WAITING_FOR_APPROVAL','ESTIMATE_APPROVED','ESTIMATE_REJECTED',
    'REPAIRING','COMPLETED','CANCELLED'
  ));

-- 3. Update repair_requests_history status constraint similarly
ALTER TABLE public.repair_requests_history DROP CONSTRAINT IF EXISTS chk_repair_history_status;
ALTER TABLE public.repair_requests_history ADD CONSTRAINT chk_repair_history_status
  CHECK (status IN (
    'PENDING','REQUESTED','CONFIRMED',
    'ASSIGNED','ACCEPTED','REJECTED',
    'EN_ROUTE','ARRIVED',
    'DIAGNOSING','DIAGNOSED',
    'ESTIMATE_SUBMITTED','WAITING_FOR_APPROVAL','ESTIMATE_APPROVED','ESTIMATE_REJECTED',
    'REPAIRING','COMPLETED','CANCELLED'
  ));
