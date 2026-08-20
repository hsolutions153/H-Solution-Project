insert into public.roles (id, code, name, description)
values
  ('ROLEADMIN1', 'ADMIN', 'Administrator', 'System administrator'),
  ('ROLECUST01', 'CUSTOMER', 'Customer', 'Repair service customer'),
  ('ROLETECH01', 'TECHNICIAN', 'Technician', 'Repair technician')
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name,
  description = excluded.description;

insert into public.users (
  id,
  role_id,
  full_name,
  phone,
  email,
  password_hash,
  address,
  is_active,
  created_by,
  updated_by
)
values
  ('ADMIN0001', 'ROLEADMIN1', 'Admin H Solution', '0900000001', 'admin@h-solution.local', null, 'Ho Chi Minh City', true, 'SYSTEM', 'SYSTEM'),
  ('CUST000001', 'ROLECUST01', 'Nguyen Van Khach', '0900000002', 'customer@h-solution.local', null, '12 Nguyen Trai, District 1', true, 'SYSTEM', 'SYSTEM'),
  ('TECH000001', 'ROLETECH01', 'Tran Van Ky Thuat', '0900000003', 'tech1@h-solution.local', null, '34 Le Loi, District 3', true, 'SYSTEM', 'SYSTEM'),
  ('TECH000002', 'ROLETECH01', 'Le Thi Sua Chua', '0900000004', 'tech2@h-solution.local', null, '56 Hai Ba Trung, District 1', true, 'SYSTEM', 'SYSTEM')
on conflict (id) do update
set
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  address = excluded.address,
  is_active = excluded.is_active,
  updated_by = excluded.updated_by;

insert into public.customer_devices (
  id,
  customer_id,
  device_type,
  manufacturer,
  model_name,
  serial_number,
  frame_number,
  image_url,
  notes,
  purchase_date,
  created_by,
  updated_by
)
values
  ('DEV0000001', 'CUST000001', 'SCOOTER', 'Honda', 'U-Go', 'SC-0001', 'FR-0001', null, 'Daily commuter scooter', '2025-03-10', 'CUST000001', 'CUST000001'),
  ('DEV0000002', 'CUST000001', 'WHEELCHAIR', 'Yamaha', 'JW Active', 'WC-0001', 'FR-0002', null, 'Electric wheelchair', '2024-11-20', 'CUST000001', 'CUST000001')
on conflict (id) do update
set
  customer_id = excluded.customer_id,
  device_type = excluded.device_type,
  manufacturer = excluded.manufacturer,
  model_name = excluded.model_name,
  serial_number = excluded.serial_number,
  frame_number = excluded.frame_number,
  image_url = excluded.image_url,
  notes = excluded.notes,
  purchase_date = excluded.purchase_date,
  updated_by = excluded.updated_by;

insert into public.technician_profiles (
  user_id,
  id_card_number,
  id_card_front,
  id_card_back,
  certificate_img,
  skills,
  specialization,
  experience_years,
  kyc_status,
  kyc_reviewed_by,
  kyc_reviewed_at,
  kyc_note,
  is_online,
  last_latitude,
  last_longitude,
  last_location_at,
  rating_avg,
  total_jobs_done,
  created_by,
  updated_by
)
values
  ('TECH000001', '012345678901', 'https://example.local/tech1-front.jpg', 'https://example.local/tech1-back.jpg', 'https://example.local/tech1-cert.jpg', 'SCOOTER', 'Battery and motor diagnostics', 4, 'APPROVED', 'ADMIN0001', now(), 'Seed approved technician', true, 10.77690000, 106.70090000, now(), 4.80, 32, 'ADMIN0001', 'ADMIN0001'),
  ('TECH000002', '112345678901', 'https://example.local/tech2-front.jpg', 'https://example.local/tech2-back.jpg', 'https://example.local/tech2-cert.jpg', 'BOTH', 'Brake and tire repair', 6, 'APPROVED', 'ADMIN0001', now(), 'Seed approved technician', false, 10.78010000, 106.69980000, now(), 4.60, 45, 'ADMIN0001', 'ADMIN0001')
on conflict (user_id) do update
set
  id_card_number = excluded.id_card_number,
  id_card_front = excluded.id_card_front,
  id_card_back = excluded.id_card_back,
  certificate_img = excluded.certificate_img,
  skills = excluded.skills,
  specialization = excluded.specialization,
  experience_years = excluded.experience_years,
  kyc_status = excluded.kyc_status,
  kyc_reviewed_by = excluded.kyc_reviewed_by,
  kyc_reviewed_at = excluded.kyc_reviewed_at,
  kyc_note = excluded.kyc_note,
  is_online = excluded.is_online,
  last_latitude = excluded.last_latitude,
  last_longitude = excluded.last_longitude,
  last_location_at = excluded.last_location_at,
  rating_avg = excluded.rating_avg,
  total_jobs_done = excluded.total_jobs_done,
  updated_by = excluded.updated_by;

insert into public.repair_requests (
  id,
  request_code,
  customer_id,
  technician_id,
  device_id,
  issue_type,
  issue_description,
  location_address,
  latitude,
  longitude,
  is_sos,
  status,
  assigned_at,
  total_amount,
  created_by,
  updated_by
)
values
  ('REQ0000001', 'RR-20260820-001', 'CUST000001', 'TECH000001', 'DEV0000001', 'BATTERY', 'Battery drains quickly and scooter cannot start reliably.', '12 Nguyen Trai, District 1', 10.77150000, 106.70410000, false, 'ASSIGNED', now(), 450000, 'CUST000001', 'ADMIN0001'),
  ('REQ0000002', 'RR-20260820-002', 'CUST000001', null, 'DEV0000002', 'BRAKE', 'Brake is loose and needs inspection.', '12 Nguyen Trai, District 1', 10.77150000, 106.70410000, true, 'PENDING', null, null, 'CUST000001', 'CUST000001')
on conflict (id) do update
set
  request_code = excluded.request_code,
  customer_id = excluded.customer_id,
  technician_id = excluded.technician_id,
  device_id = excluded.device_id,
  issue_type = excluded.issue_type,
  issue_description = excluded.issue_description,
  location_address = excluded.location_address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_sos = excluded.is_sos,
  status = excluded.status,
  assigned_at = excluded.assigned_at,
  total_amount = excluded.total_amount,
  updated_by = excluded.updated_by;

insert into public.payments (
  id,
  repair_id,
  payment_code,
  amount,
  currency,
  payment_method,
  payment_status,
  transaction_code,
  note,
  created_by,
  updated_by
)
values
  ('PAY0000001', 'REQ0000001', 'PAY-20260820-001', 450000, 'VND', 'QR', 'PENDING', null, 'Seed QR payment awaiting provider callback', 'SYSTEM', 'SYSTEM')
on conflict (id) do update
set
  repair_id = excluded.repair_id,
  payment_code = excluded.payment_code,
  amount = excluded.amount,
  currency = excluded.currency,
  payment_method = excluded.payment_method,
  payment_status = excluded.payment_status,
  transaction_code = excluded.transaction_code,
  note = excluded.note,
  updated_by = excluded.updated_by;

insert into public.payment_transactions (
  id,
  payment_id,
  provider,
  transaction_code,
  amount,
  currency,
  status,
  qr_payload,
  qr_image_url,
  raw_payload,
  occurred_at
)
values
  (
    'PTX0000001',
    'PAY0000001',
    'SEED_QR',
    'QR-SEED-0001',
    450000,
    'VND',
    'PENDING',
    'bank=SEED&account=0000000000&amount=450000&description=PAY-20260820-001',
    null,
    '{"source":"seed"}'::jsonb,
    now()
  )
on conflict (id) do update
set
  payment_id = excluded.payment_id,
  provider = excluded.provider,
  transaction_code = excluded.transaction_code,
  amount = excluded.amount,
  currency = excluded.currency,
  status = excluded.status,
  qr_payload = excluded.qr_payload,
  qr_image_url = excluded.qr_image_url,
  raw_payload = excluded.raw_payload,
  occurred_at = excluded.occurred_at;
