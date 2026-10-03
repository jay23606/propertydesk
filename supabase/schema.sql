-- PropertyDesk private workspace schema.
-- Run this in the Supabase SQL editor before configuring the static app.
create extension if not exists pgcrypto;

create table if not exists public.pd_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  city text,
  state text,
  postal_code text,
  property_kind text not null default 'residential' check (property_kind in ('residential','land','commercial','other')),
  notes text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pd_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.pd_properties(id) on delete cascade,
  account_type text not null check (account_type in ('rental','land_contract','note')),
  name text not null,
  party_name text,
  party_email text,
  start_date date not null,
  next_due_date date,
  payment_amount numeric(14,2) not null default 0 check (payment_amount >= 0),
  payment_frequency text not null default 'monthly' check (payment_frequency in ('monthly','weekly','biweekly','quarterly','annual')),
  original_principal numeric(14,2) not null default 0 check (original_principal >= 0),
  ledger_opening_balance numeric(14,2) check (ledger_opening_balance is null or ledger_opening_balance >= 0),
  ledger_opening_date date,
  interest_rate numeric(9,5) not null default 0 check (interest_rate >= 0 and interest_rate <= 100),
  term_months integer check (term_months is null or term_months > 0),
  balloon_date date,
  late_fee numeric(14,2) not null default 0 check (late_fee >= 0),
  grace_days integer not null default 0 check (grace_days >= 0),
  status text not null default 'active' check (status in ('active','paused','closed')),
  notes text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pd_accounts add column if not exists ledger_opening_balance numeric(14,2) check (ledger_opening_balance is null or ledger_opening_balance >= 0);
alter table public.pd_accounts add column if not exists ledger_opening_date date;
alter table public.pd_accounts add column if not exists party_email text;

create table if not exists public.pd_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.pd_accounts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  received_date date not null,
  payment_method text not null default 'manual' check (payment_method in ('manual','check','cash','bank_transfer','money_order','card')),
  income_category text not null default 'rent' check (income_category in ('rent','late_fee','deposit','installment','other')),
  principal_amount numeric(14,2) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
  fee_amount numeric(14,2) not null default 0 check (fee_amount >= 0),
  unapplied_amount numeric(14,2) not null default 0 check (unapplied_amount >= 0),
  memo text,
  source_type text not null default 'manual' check (source_type in ('manual','csv_import','other')),
  status text not null default 'posted' check (status in ('posted','voided')),
  voided_at timestamptz,
  void_reason text,
  import_batch_id uuid,
  recorded_at timestamptz not null default now()
);

alter table public.pd_payments add column if not exists status text not null default 'posted' check (status in ('posted','voided'));
alter table public.pd_payments add column if not exists voided_at timestamptz;
alter table public.pd_payments add column if not exists void_reason text;

create table if not exists public.pd_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.pd_properties(id) on delete cascade,
  account_id uuid references public.pd_accounts(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null,
  category text not null default 'other' check (category in ('repairs','contractor','materials','taxes','insurance','utilities','management','other')),
  payee text,
  payment_method text not null default 'manual' check (payment_method in ('manual','check','cash','bank_transfer','card','other')),
  memo text,
  receipt_path text,
  source_type text not null default 'manual' check (source_type in ('manual','csv_import','other')),
  import_batch_id uuid,
  status text not null default 'posted' check (status in ('posted','voided')),
  voided_at timestamptz,
  void_reason text,
  recorded_at timestamptz not null default now()
);

alter table public.pd_expenses add column if not exists voided_at timestamptz;
alter table public.pd_expenses add column if not exists void_reason text;

create table if not exists public.pd_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('csv','manual_backfill','other')),
  source_name text,
  status text not null default 'staged' check (status in ('staged','reviewed','committed','failed')),
  rows_total integer not null default 0,
  rows_accepted integer not null default 0,
  rows_rejected integer not null default 0,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

alter table public.pd_properties add column if not exists import_batch_id uuid;
alter table public.pd_accounts add column if not exists import_batch_id uuid;
alter table public.pd_payments add column if not exists import_batch_id uuid;
alter table public.pd_expenses add column if not exists import_batch_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pd_properties_import_batch_id_fkey' and conrelid = 'public.pd_properties'::regclass) then
    alter table public.pd_properties add constraint pd_properties_import_batch_id_fkey foreign key (import_batch_id) references public.pd_import_batches(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pd_accounts_import_batch_id_fkey' and conrelid = 'public.pd_accounts'::regclass) then
    alter table public.pd_accounts add constraint pd_accounts_import_batch_id_fkey foreign key (import_batch_id) references public.pd_import_batches(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pd_payments_import_batch_id_fkey' and conrelid = 'public.pd_payments'::regclass) then
    alter table public.pd_payments add constraint pd_payments_import_batch_id_fkey foreign key (import_batch_id) references public.pd_import_batches(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pd_expenses_import_batch_id_fkey' and conrelid = 'public.pd_expenses'::regclass) then
    alter table public.pd_expenses add constraint pd_expenses_import_batch_id_fkey foreign key (import_batch_id) references public.pd_import_batches(id) on delete set null;
  end if;
end $$;

create table if not exists public.pd_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('created','updated','voided','imported','deleted')),
  summary text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pd_properties_user_idx on public.pd_properties(user_id);
create index if not exists pd_accounts_user_idx on public.pd_accounts(user_id);
create index if not exists pd_accounts_property_idx on public.pd_accounts(property_id);
create index if not exists pd_payments_user_date_idx on public.pd_payments(user_id, received_date desc);
create index if not exists pd_payments_account_idx on public.pd_payments(account_id, received_date desc);
create index if not exists pd_expenses_user_date_idx on public.pd_expenses(user_id, expense_date desc);
create index if not exists pd_expenses_property_idx on public.pd_expenses(property_id, expense_date desc);
create index if not exists pd_import_batches_user_idx on public.pd_import_batches(user_id, created_at desc);
create index if not exists pd_audit_events_user_entity_idx on public.pd_audit_events(user_id, entity_type, entity_id, created_at desc);

alter table public.pd_properties enable row level security;
alter table public.pd_accounts enable row level security;
alter table public.pd_payments enable row level security;
alter table public.pd_expenses enable row level security;
alter table public.pd_import_batches enable row level security;
alter table public.pd_audit_events enable row level security;

drop policy if exists "Users manage pd_properties" on public.pd_properties;
create policy "Users manage pd_properties" on public.pd_properties for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and (import_batch_id is null or exists (select 1 from public.pd_import_batches b where b.id = import_batch_id and b.user_id = auth.uid()))
);
drop policy if exists "Users manage pd_accounts" on public.pd_accounts;
create policy "Users manage pd_accounts" on public.pd_accounts for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.pd_properties p where p.id = property_id and p.user_id = auth.uid())
  and (import_batch_id is null or exists (select 1 from public.pd_import_batches b where b.id = import_batch_id and b.user_id = auth.uid()))
);
drop policy if exists "Users manage pd_payments" on public.pd_payments;
create policy "Users manage pd_payments" on public.pd_payments for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.pd_accounts a where a.id = account_id and a.user_id = auth.uid())
  and (import_batch_id is null or exists (select 1 from public.pd_import_batches b where b.id = import_batch_id and b.user_id = auth.uid()))
);
drop policy if exists "Users manage pd_expenses" on public.pd_expenses;
create policy "Users manage pd_expenses" on public.pd_expenses for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.pd_properties p where p.id = property_id and p.user_id = auth.uid())
  and (account_id is null or exists (select 1 from public.pd_accounts a where a.id = account_id and a.user_id = auth.uid() and a.property_id = property_id))
  and (import_batch_id is null or exists (select 1 from public.pd_import_batches b where b.id = import_batch_id and b.user_id = auth.uid()))
);
drop policy if exists "Users manage pd_import_batches" on public.pd_import_batches;
create policy "Users manage pd_import_batches" on public.pd_import_batches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users manage pd_audit_events" on public.pd_audit_events;
drop policy if exists "Users can read pd_audit_events" on public.pd_audit_events;
create policy "Users can read pd_audit_events" on public.pd_audit_events for select to authenticated using (user_id = auth.uid());

create or replace function public.guard_propertydesk_user_id()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'user_id must match the authenticated user';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pd_properties_user_guard on public.pd_properties;
create trigger pd_properties_user_guard before insert or update on public.pd_properties for each row execute function public.guard_propertydesk_user_id();
drop trigger if exists pd_accounts_user_guard on public.pd_accounts;
create trigger pd_accounts_user_guard before insert or update on public.pd_accounts for each row execute function public.guard_propertydesk_user_id();

create or replace function public.propertydesk_audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_user_id uuid;
  row_id uuid;
  event_action text;
begin
  if tg_op = 'DELETE' then
    row_user_id := old.user_id;
    row_id := old.id;
    event_action := 'deleted';
    insert into public.pd_audit_events(user_id, entity_type, entity_id, action, summary, before_data)
      values (row_user_id, tg_table_name, row_id, event_action, 'Deleted row from ' || tg_table_name, to_jsonb(old));
    return old;
  end if;
  row_user_id := new.user_id;
  row_id := new.id;
  if tg_op = 'INSERT' then
    event_action := 'created';
  elsif tg_table_name in ('pd_payments','pd_expenses') then
    if old.status = 'posted' and new.status = 'voided' then
      event_action := 'voided';
    else
      event_action := 'updated';
    end if;
  else
    event_action := 'updated';
  end if;
  insert into public.pd_audit_events(user_id, entity_type, entity_id, action, summary, before_data, after_data)
    values (row_user_id, tg_table_name, row_id, event_action,
      case when event_action = 'voided' then 'Voided transaction in ' || tg_table_name else 'Recorded ' || lower(tg_op) || ' in ' || tg_table_name end,
      case when tg_op = 'INSERT' then null else to_jsonb(old) end, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists pd_properties_audit on public.pd_properties;
create trigger pd_properties_audit after insert or update or delete on public.pd_properties for each row execute function public.propertydesk_audit_row();
drop trigger if exists pd_accounts_audit on public.pd_accounts;
create trigger pd_accounts_audit after insert or update or delete on public.pd_accounts for each row execute function public.propertydesk_audit_row();
drop trigger if exists pd_payments_audit on public.pd_payments;
create trigger pd_payments_audit after insert or update or delete on public.pd_payments for each row execute function public.propertydesk_audit_row();
drop trigger if exists pd_expenses_audit on public.pd_expenses;
create trigger pd_expenses_audit after insert or update or delete on public.pd_expenses for each row execute function public.propertydesk_audit_row();

create or replace function public.pd_guard_transaction_void()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'posted' or new.voided_at is not null or new.void_reason is not null then
      raise exception 'Transactions must be inserted as posted; use the void action for corrections';
    end if;
    return new;
  end if;
  if old.status = 'voided' then raise exception 'Voided transactions cannot be changed or reposted'; end if;
  if old.status <> 'posted' or new.status <> 'voided' then
    raise exception 'The only permitted transaction update is posted to voided';
  end if;
  new.voided_at := now();
  new.void_reason := left(coalesce(nullif(btrim(new.void_reason), ''), 'Voided by owner'), 500);
  return new;
end;
$$;

drop trigger if exists pd_payments_void_guard on public.pd_payments;
create trigger pd_payments_void_guard before insert or update on public.pd_payments for each row execute function public.pd_guard_transaction_void();
drop trigger if exists pd_expenses_void_guard on public.pd_expenses;
create trigger pd_expenses_void_guard before insert or update on public.pd_expenses for each row execute function public.pd_guard_transaction_void();

-- Account and transaction imports are atomic and keep a private source receipt.
drop function if exists public.pd_import_propertydesk_accounts(jsonb);
drop function if exists public.pd_import_propertydesk_accounts(jsonb, text);
create or replace function public.pd_import_propertydesk_accounts(p_rows jsonb, p_source_name text, p_rows_total integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  property_id uuid;
  batch_id uuid;
  inserted_count integer := 0;
  total_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'An account import must contain at least one row';
  end if;
  total_count := coalesce(p_rows_total, jsonb_array_length(p_rows));
  if jsonb_array_length(p_rows) > 500 or total_count > 500 then raise exception 'Import is limited to 500 accounts'; end if;
  if total_count < jsonb_array_length(p_rows) then raise exception 'Total CSV rows cannot be less than accepted rows'; end if;
  insert into public.pd_import_batches(user_id, source_type, source_name, status, rows_total)
    values (auth.uid(), 'csv', left(coalesce(nullif(btrim(p_source_name), ''), 'Accounts CSV'), 255), 'staged', total_count)
    returning id into batch_id;

  for item in
    select distinct on (lower(value->>'property_name'), lower(value->>'property_address')) value
    from jsonb_array_elements(p_rows) as source(value)
    order by lower(value->>'property_name'), lower(value->>'property_address')
  loop
    select p.id into property_id from public.pd_properties p
      where lower(p.name) = lower(item->>'property_name')
        and lower(p.address) = lower(item->>'property_address')
      limit 1;
    if property_id is null then
       insert into public.pd_properties(user_id, name, address, city, state, postal_code, property_kind, import_batch_id)
       values (auth.uid(), item->>'property_name', item->>'property_address',
         nullif(item->>'city',''), nullif(item->>'state',''), nullif(item->>'postal_code',''),
         coalesce(nullif(item->>'property_kind',''), 'residential'), batch_id)
      returning id into property_id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_rows) as source(value)
  loop
    select p.id into property_id from public.pd_properties p
      where lower(p.name) = lower(item->>'property_name')
        and lower(p.address) = lower(item->>'property_address')
      limit 1;
    if property_id is null then raise exception 'Property was not created or is not visible to this user'; end if;
    insert into public.pd_accounts(user_id, property_id, account_type, name, party_name, party_email,
      start_date, next_due_date, payment_amount, payment_frequency, original_principal,
      ledger_opening_balance, ledger_opening_date,
      interest_rate, term_months, balloon_date, late_fee, grace_days, notes, import_batch_id)
    values (auth.uid(), property_id, item->>'account_type', item->>'account_name',
      nullif(item->>'party_name',''), nullif(item->>'party_email',''), (item->>'start_date')::date,
      nullif(item->>'next_due_date','')::date,
      coalesce(nullif(item->>'payment_amount','')::numeric, 0),
      coalesce(nullif(item->>'payment_frequency',''), 'monthly'),
      coalesce(nullif(item->>'original_principal','')::numeric, 0),
      nullif(item->>'ledger_opening_balance','')::numeric,
      nullif(item->>'ledger_opening_date','')::date,
      coalesce(nullif(item->>'interest_rate','')::numeric, 0),
      nullif(item->>'term_months','')::integer, nullif(item->>'balloon_date','')::date,
      coalesce(nullif(item->>'late_fee','')::numeric, 0),
      coalesce(nullif(item->>'grace_days','')::integer, 0), nullif(item->>'notes',''), batch_id);
    inserted_count := inserted_count + 1;
  end loop;
  update public.pd_import_batches set status = 'committed', rows_accepted = inserted_count, rows_rejected = total_count - inserted_count, committed_at = now() where id = batch_id;
  return jsonb_build_object('batch_id', batch_id, 'rows_total', total_count, 'rows_accepted', inserted_count, 'rows_rejected', total_count - inserted_count);
end;
$$;

revoke all on function public.pd_import_propertydesk_accounts(jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.pd_import_propertydesk_accounts(jsonb, text, integer) to authenticated;

drop function if exists public.pd_import_propertydesk_transactions(text, jsonb, text);
create or replace function public.pd_import_propertydesk_transactions(p_kind text, p_rows jsonb, p_source_name text, p_rows_total integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  batch_id uuid;
  inserted_count integer := 0;
  row_count integer;
  total_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_kind is null or p_kind not in ('payments','expenses') then raise exception 'Import type must be payments or expenses'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'An import must contain at least one row';
  end if;
  row_count := jsonb_array_length(p_rows);
  total_count := coalesce(p_rows_total, row_count);
  if row_count > 500 or total_count > 500 then raise exception 'Import is limited to 500 rows'; end if;
  if total_count < row_count then raise exception 'Total CSV rows cannot be less than accepted rows'; end if;

  insert into public.pd_import_batches(user_id, source_type, source_name, status, rows_total)
    values (auth.uid(), 'csv', left(coalesce(nullif(btrim(p_source_name), ''), 'Transactions CSV'), 255), 'staged', total_count)
    returning id into batch_id;

  for item in select value from jsonb_array_elements(p_rows) as source(value)
  loop
    if p_kind = 'payments' then
      insert into public.pd_payments(user_id, account_id, amount, received_date, payment_method,
        income_category, principal_amount, interest_amount, fee_amount, unapplied_amount,
        memo, source_type, import_batch_id)
      values (auth.uid(), (item->>'account_id')::uuid, (item->>'amount')::numeric,
        (item->>'received_date')::date, coalesce(nullif(item->>'payment_method',''), 'manual'),
        coalesce(nullif(item->>'income_category',''), 'installment'),
        coalesce(nullif(item->>'principal_amount','')::numeric, 0),
        coalesce(nullif(item->>'interest_amount','')::numeric, 0),
        coalesce(nullif(item->>'fee_amount','')::numeric, 0),
        coalesce(nullif(item->>'unapplied_amount','')::numeric, 0),
        nullif(item->>'memo',''), 'csv_import', batch_id);
    else
      insert into public.pd_expenses(user_id, property_id, account_id, amount, expense_date,
        category, payee, payment_method, memo, source_type, import_batch_id)
      values (auth.uid(), (item->>'property_id')::uuid, nullif(item->>'account_id','')::uuid,
        (item->>'amount')::numeric, (item->>'expense_date')::date,
        coalesce(nullif(item->>'category',''), 'other'), nullif(item->>'payee',''),
        coalesce(nullif(item->>'payment_method',''), 'manual'), nullif(item->>'memo',''),
        'csv_import', batch_id);
    end if;
    inserted_count := inserted_count + 1;
  end loop;

  update public.pd_import_batches set status = 'committed', rows_accepted = inserted_count, rows_rejected = total_count - inserted_count, committed_at = now() where id = batch_id;
  return jsonb_build_object('batch_id', batch_id, 'rows_total', total_count, 'rows_accepted', inserted_count, 'rows_rejected', total_count - inserted_count);
end;
$$;

revoke all on function public.pd_import_propertydesk_transactions(text, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.pd_import_propertydesk_transactions(text, jsonb, text, integer) to authenticated;

-- Signed-out clients cannot read or mutate portfolio records.
revoke all on table public.pd_properties, public.pd_accounts, public.pd_payments,
  public.pd_expenses, public.pd_import_batches, public.pd_audit_events from anon;
revoke all on table public.pd_properties, public.pd_accounts, public.pd_payments,
  public.pd_expenses, public.pd_import_batches, public.pd_audit_events from authenticated;
grant select, insert, update on table public.pd_properties, public.pd_accounts to authenticated;
grant select, insert on table public.pd_payments, public.pd_expenses to authenticated;
grant update (status, voided_at, void_reason) on table public.pd_payments, public.pd_expenses to authenticated;
grant select, insert, update on table public.pd_import_batches to authenticated;
grant select on table public.pd_audit_events to authenticated;
