-- Align status history naming with backend code, add automatic status logging,
-- and prepare payment tracking for QR payment flows.

do $$
begin
  if to_regclass('public.repair_status_history') is null
     and to_regclass('public.repair_requests_history') is not null then
    alter table public.repair_requests_history rename to repair_status_history;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'repair_status_history'
      and column_name = 'status'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'repair_status_history'
      and column_name = 'new_status'
  ) then
    alter table public.repair_status_history rename column status to new_status;
  end if;
end $$;

alter table public.repair_status_history
  add column if not exists old_status character varying(50),
  add column if not exists api_endpoint text;

alter table public.repair_status_history
  alter column new_status set not null;

alter table public.repair_status_history
  drop constraint if exists chk_repair_history_status;

alter table public.repair_status_history
  add constraint chk_repair_status_history_old_status
  check (
    old_status is null
    or old_status in ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'DIAGNOSED', 'REPAIRING', 'COMPLETED', 'CANCELLED')
  );

alter table public.repair_status_history
  add constraint chk_repair_status_history_new_status
  check (
    new_status in ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'DIAGNOSED', 'REPAIRING', 'COMPLETED', 'CANCELLED')
  );

alter table public.repair_status_history
  drop constraint if exists fk_repair_history_user;

alter table public.repair_status_history
  add constraint fk_repair_status_history_user
  foreign key (changed_by) references public.users(id);

alter table public.repair_status_history
  drop constraint if exists fk_repair_history_repair;

alter table public.repair_status_history
  add constraint fk_repair_status_history_repair
  foreign key (repair_id) references public.repair_requests(id) on delete cascade;

drop index if exists public.idx_repair_history_repair;
drop index if exists public.idx_repair_history_status;

create index if not exists idx_repair_status_history_repair
  on public.repair_status_history using btree (repair_id, changed_at);

create index if not exists idx_repair_status_history_new_status
  on public.repair_status_history using btree (new_status, changed_at);

create schema if not exists private;

create or replace function private.log_repair_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id character varying(10);
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  actor_id := coalesce(
    nullif(new.updated_by, 'SYSTEM'),
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    old.technician_id,
    old.customer_id
  );

  insert into public.repair_status_history (
    id,
    repair_id,
    old_status,
    new_status,
    changed_by,
    api_endpoint,
    note,
    changed_at
  ) values (
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    new.id,
    old.status,
    new.status,
    actor_id,
    nullif(current_setting('request.path', true), ''),
    case
      when new.status = 'CANCELLED' then new.cancel_reason
      else null
    end,
    now()
  );

  return new;
end;
$function$;

revoke execute on function private.log_repair_request_status_change() from public, anon, authenticated, service_role;

drop trigger if exists trg_repair_requests_status_history on public.repair_requests;

create trigger trg_repair_requests_status_history
after update of status on public.repair_requests
for each row
when (old.status is distinct from new.status)
execute function private.log_repair_request_status_change();

alter table public.payments
  drop constraint if exists chk_payment_method;

alter table public.payments
  add constraint chk_payment_method
  check (payment_method in ('CASH', 'BANK_TRANSFER', 'QR'));

alter table public.payments
  drop constraint if exists chk_payment_status;

alter table public.payments
  add constraint chk_payment_status
  check (payment_status in ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED'));

create table if not exists public.payment_transactions (
  id character varying(10) not null,
  payment_id character varying(10) not null,
  provider character varying(50) not null,
  transaction_code character varying(100),
  amount numeric(12,0) not null,
  currency character varying(3) not null default 'VND',
  status character varying(30) not null default 'PENDING',
  qr_payload text,
  qr_image_url character varying(500),
  raw_payload jsonb,
  occurred_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint payment_transactions_pkey primary key (id),
  constraint chk_payment_transactions_amount check (amount >= 0),
  constraint chk_payment_transactions_currency check (currency in ('VND', 'USD')),
  constraint chk_payment_transactions_status check (status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')),
  constraint fk_payment_transactions_payment foreign key (payment_id) references public.payments(id) on delete cascade
);

alter table public.payment_transactions enable row level security;

create unique index if not exists idx_payment_transactions_provider_code
  on public.payment_transactions using btree (provider, transaction_code)
  where transaction_code is not null;

create index if not exists idx_payment_transactions_payment
  on public.payment_transactions using btree (payment_id, created_at);

create index if not exists idx_payment_transactions_status
  on public.payment_transactions using btree (status, created_at);

grant delete, insert, references, select, trigger, update
  on table public.repair_status_history to anon, authenticated, postgres, service_role;

grant delete, insert, references, select, trigger, update
  on table public.payment_transactions to anon, authenticated, postgres, service_role;
