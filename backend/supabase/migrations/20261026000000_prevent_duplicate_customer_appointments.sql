alter table public.repair_requests
  add column if not exists appointment_key character varying(16);

create unique index if not exists uq_repair_requests_customer_appointment_open
  on public.repair_requests (customer_id, appointment_key)
  where appointment_key is not null
    and status not in ('COMPLETED', 'CANCELLED');
