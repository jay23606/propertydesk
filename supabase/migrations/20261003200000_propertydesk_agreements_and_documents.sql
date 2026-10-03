-- Add amendment history, owner balance adjustments, and private property agreements.
-- This migration is additive and does not modify or delete existing portfolio rows.

alter table public.pd_accounts
  add column if not exists balance_adjustment numeric(14,2) not null default 0,
  add column if not exists agreement_effective_date date,
  add column if not exists agreement_change_reason text;

create table if not exists public.pd_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pd_accounts(id) on delete cascade,
  effective_from date not null,
  replaced_on date not null,
  reason text not null default 'Terms updated',
  terms jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pd_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.pd_properties(id) on delete cascade,
  account_id uuid references public.pd_accounts(id) on delete set null,
  file_name text not null,
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  created_at timestamptz not null default now()
);

create index if not exists pd_agreement_versions_account_date_idx
  on public.pd_agreement_versions(user_id, account_id, replaced_on desc);
create index if not exists pd_documents_user_property_idx
  on public.pd_documents(user_id, property_id, created_at desc);

alter table public.pd_agreement_versions enable row level security;
alter table public.pd_documents enable row level security;

drop policy if exists "Users read pd_agreement_versions" on public.pd_agreement_versions;
create policy "Users read pd_agreement_versions" on public.pd_agreement_versions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users manage pd_documents" on public.pd_documents;
create policy "Users manage pd_documents" on public.pd_documents
  for all to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.pd_properties p where p.id = property_id and p.user_id = auth.uid())
    and (account_id is null or exists (
      select 1 from public.pd_accounts a
      where a.id = account_id and a.user_id = auth.uid() and a.property_id = property_id
    ))
    and split_part(storage_path, '/', 1) = auth.uid()::text
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('pd-private-agreements', 'pd-private-agreements', false, 15728640,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their private PropertyDesk files" on storage.objects;
create policy "Users read their private PropertyDesk files" on storage.objects
  for select to authenticated
  using (bucket_id = 'pd-private-agreements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users upload their private PropertyDesk files" on storage.objects;
create policy "Users upload their private PropertyDesk files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pd-private-agreements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete their private PropertyDesk files" on storage.objects;
create policy "Users delete their private PropertyDesk files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pd-private-agreements' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.pd_capture_agreement_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or old.user_id is distinct from auth.uid() then
    raise exception 'Authenticated account owner required to change agreement terms';
  end if;
  if jsonb_build_object(
    'property_id',old.property_id,'account_type',old.account_type,'name',old.name,
    'party_name',old.party_name,'party_email',old.party_email,'start_date',old.start_date,
    'next_due_date',old.next_due_date,'payment_amount',old.payment_amount,
    'payment_frequency',old.payment_frequency,'original_principal',old.original_principal,
    'principal_interest_amount',old.principal_interest_amount,
    'ledger_opening_balance',old.ledger_opening_balance,'ledger_opening_date',old.ledger_opening_date,
    'interest_rate',old.interest_rate,'term_months',old.term_months,'balloon_date',old.balloon_date,
    'late_fee',old.late_fee,'grace_days',old.grace_days,'notes',old.notes
  ) is distinct from jsonb_build_object(
    'property_id',new.property_id,'account_type',new.account_type,'name',new.name,
    'party_name',new.party_name,'party_email',new.party_email,'start_date',new.start_date,
    'next_due_date',new.next_due_date,'payment_amount',new.payment_amount,
    'payment_frequency',new.payment_frequency,'original_principal',new.original_principal,
    'principal_interest_amount',new.principal_interest_amount,
    'ledger_opening_balance',new.ledger_opening_balance,'ledger_opening_date',new.ledger_opening_date,
    'interest_rate',new.interest_rate,'term_months',new.term_months,'balloon_date',new.balloon_date,
    'late_fee',new.late_fee,'grace_days',new.grace_days,'notes',new.notes
  ) then
    insert into public.pd_agreement_versions(user_id, account_id, effective_from, replaced_on, reason, terms)
    values (
      old.user_id, old.id, coalesce(old.agreement_effective_date, old.start_date),
      coalesce(new.agreement_effective_date, current_date),
      left(coalesce(nullif(btrim(new.agreement_change_reason), ''), 'Terms updated'), 500),
      to_jsonb(old)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.pd_capture_agreement_version() from public, anon, authenticated;
drop trigger if exists pd_accounts_agreement_history on public.pd_accounts;
create trigger pd_accounts_agreement_history before update on public.pd_accounts
  for each row execute function public.pd_capture_agreement_version();

revoke all on table public.pd_agreement_versions, public.pd_documents from anon, authenticated;
grant select on table public.pd_agreement_versions to authenticated;
grant select, insert, delete on table public.pd_documents to authenticated;
