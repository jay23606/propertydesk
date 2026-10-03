-- Track rental security-deposit liability movements separately from rent and operating expenses.
alter table public.pd_expenses drop constraint if exists pd_expenses_category_check;
alter table public.pd_expenses add constraint pd_expenses_category_check
  check (category in ('repairs','contractor','materials','taxes','insurance','utilities','management','deposit_refund','other'));

create table if not exists public.pd_deposit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pd_accounts(id) on delete cascade,
  entry_type text not null check (entry_type in ('received','refunded','retained','restored')),
  amount numeric(14,2) not null check (amount > 0),
  movement_date date not null,
  reason text not null,
  source_payment_id uuid references public.pd_payments(id) on delete cascade,
  source_expense_id uuid references public.pd_expenses(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (entry_type='received' and source_payment_id is not null and source_expense_id is null) or
    (entry_type='refunded' and source_payment_id is null and source_expense_id is not null) or
    (entry_type in ('retained','restored') and source_payment_id is null and source_expense_id is null)
  )
);
create index if not exists pd_deposit_entries_account_date_idx
  on public.pd_deposit_entries(user_id,account_id,movement_date desc,created_at desc);
create unique index if not exists pd_deposit_entries_payment_source_idx
  on public.pd_deposit_entries(source_payment_id) where source_payment_id is not null;
create unique index if not exists pd_deposit_entries_expense_source_idx
  on public.pd_deposit_entries(source_expense_id) where source_expense_id is not null;

alter table public.pd_deposit_entries enable row level security;
revoke all on table public.pd_deposit_entries from public,anon,authenticated;
grant select,insert on table public.pd_deposit_entries to authenticated;
drop policy if exists "pd workspace deposit entry read" on public.pd_deposit_entries;
create policy "pd workspace deposit entry read" on public.pd_deposit_entries
  for select to authenticated using (public.pd_can_access_workspace(user_id));
drop policy if exists "pd workspace deposit entry insert" on public.pd_deposit_entries;
create policy "pd workspace deposit entry insert" on public.pd_deposit_entries
  for insert to authenticated with check (
    user_id=public.pd_workspace_id() and exists(
      select 1 from public.pd_accounts a where a.id=account_id and a.user_id=user_id and a.account_type='rental'
    )
  );

create or replace function public.pd_guard_deposit_entry()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  account_row public.pd_accounts%rowtype;
  source_payment public.pd_payments%rowtype;
  source_expense public.pd_expenses%rowtype;
  held_balance numeric(14,2);
  remaining_retention numeric(14,2);
begin
  if auth.uid() is null or new.user_id is distinct from public.pd_workspace_id() then
    raise exception 'Deposit entries must belong to the active workspace';
  end if;
  select * into account_row from public.pd_accounts a
    where a.id=new.account_id and a.user_id=new.user_id and a.account_type='rental';
  if not found then raise exception 'Security deposits can only be tracked for a rental account in this workspace'; end if;
  if nullif(btrim(new.reason),'') is null then raise exception 'Enter a reason for this deposit movement'; end if;

  if new.entry_type='received' then
    select * into source_payment from public.pd_payments p
      where p.id=new.source_payment_id and p.user_id=new.user_id and p.account_id=new.account_id
        and p.income_category='deposit' and p.amount=new.amount and p.received_date=new.movement_date;
    if not found then raise exception 'Deposit receipt must match a security-deposit payment'; end if;
  elsif new.entry_type='refunded' then
    select * into source_expense from public.pd_expenses e
      where e.id=new.source_expense_id and e.user_id=new.user_id and e.account_id=new.account_id
        and e.category='deposit_refund' and e.amount=new.amount and e.expense_date=new.movement_date;
    if not found then raise exception 'Deposit refund must match a security-deposit-refund expense'; end if;
    select coalesce(sum(case
      when d.entry_type='received' and p.status='posted' then d.amount
      when d.entry_type='refunded' and e.status='posted' then -d.amount
      when d.entry_type='retained' then -d.amount
      when d.entry_type='restored' then d.amount
      else 0 end),0)
      into held_balance
      from public.pd_deposit_entries d
      left join public.pd_payments p on p.id=d.source_payment_id
      left join public.pd_expenses e on e.id=d.source_expense_id
      where d.account_id=new.account_id;
    if new.amount>held_balance then raise exception 'Refund exceeds the recorded held deposit balance'; end if;
  elsif new.entry_type='retained' then
    select coalesce(sum(case
      when d.entry_type='received' and p.status='posted' then d.amount
      when d.entry_type='refunded' and e.status='posted' then -d.amount
      when d.entry_type='retained' then -d.amount
      when d.entry_type='restored' then d.amount
      else 0 end),0)
      into held_balance
      from public.pd_deposit_entries d
      left join public.pd_payments p on p.id=d.source_payment_id
      left join public.pd_expenses e on e.id=d.source_expense_id
      where d.account_id=new.account_id;
    if new.amount>held_balance then raise exception 'Retention exceeds the recorded held deposit balance'; end if;
  elsif new.entry_type='restored' then
    select coalesce(sum(case when d.entry_type='retained' then d.amount when d.entry_type='restored' then -d.amount else 0 end),0)
      into remaining_retention from public.pd_deposit_entries d where d.account_id=new.account_id;
    if new.amount>remaining_retention then raise exception 'Retention reversal exceeds previously retained amounts'; end if;
  end if;

  new.reason:=left(btrim(new.reason),500);
  return new;
end;
$$;
drop trigger if exists pd_deposit_entry_guard on public.pd_deposit_entries;
create trigger pd_deposit_entry_guard before insert on public.pd_deposit_entries
  for each row execute function public.pd_guard_deposit_entry();
revoke all on function public.pd_guard_deposit_entry() from public,anon,authenticated;

create or replace function public.pd_track_security_deposit_payment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.income_category='deposit' then
    insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason,source_payment_id)
      values(new.user_id,new.account_id,'received',new.amount,new.received_date,
        coalesce(nullif(btrim(new.memo),''),'Security deposit received'),new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists pd_track_security_deposit_payment on public.pd_payments;
create trigger pd_track_security_deposit_payment after insert on public.pd_payments
  for each row execute function public.pd_track_security_deposit_payment();
revoke all on function public.pd_track_security_deposit_payment() from public,anon,authenticated;

create or replace function public.pd_track_security_deposit_refund()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.category='deposit_refund' then
    if new.account_id is null then raise exception 'Link a security deposit refund to a rental account'; end if;
    insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason,source_expense_id)
      values(new.user_id,new.account_id,'refunded',new.amount,new.expense_date,
        coalesce(nullif(btrim(new.memo),''),'Security deposit refunded'),new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists pd_track_security_deposit_refund on public.pd_expenses;
create trigger pd_track_security_deposit_refund after insert on public.pd_expenses
  for each row execute function public.pd_track_security_deposit_refund();
revoke all on function public.pd_track_security_deposit_refund() from public,anon,authenticated;

drop trigger if exists pd_deposit_entries_audit on public.pd_deposit_entries;
create trigger pd_deposit_entries_audit after insert on public.pd_deposit_entries
  for each row execute function public.propertydesk_audit_row();

-- Backfill the separate liability trail for historical deposit cash movements without changing transactions.
insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason,source_payment_id)
select p.user_id,p.account_id,'received',p.amount,p.received_date,
  coalesce(nullif(btrim(p.memo),''),'Security deposit received'),p.id
from public.pd_payments p join public.pd_accounts a on a.id=p.account_id
where p.income_category='deposit' and a.account_type='rental'
on conflict do nothing;
