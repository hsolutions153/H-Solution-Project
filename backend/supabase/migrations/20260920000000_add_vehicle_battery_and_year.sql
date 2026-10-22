-- Migration: Add vehicle battery_type and manufacturing_year to customer_devices
-- Supports electric motorbike and electric vehicle minimum data structure for repair service

ALTER TABLE public.customer_devices
  ADD COLUMN IF NOT EXISTS battery_type character varying(100),
  ADD COLUMN IF NOT EXISTS manufacturing_year integer;

-- Update comments for documentation
COMMENT ON COLUMN public.customer_devices.battery_type IS 'Loại pin của xe (LFP, Lithium-ion, Chì-axit, Graphene...) phục vụ dịch vụ sửa chữa';
COMMENT ON COLUMN public.customer_devices.manufacturing_year IS 'Năm sản xuất xe điện (tùy chọn)';
