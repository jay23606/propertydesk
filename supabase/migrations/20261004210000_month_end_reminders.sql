alter table public.pd_accounts
  add column if not exists monthly_reminder_enabled boolean not null default false;

create table if not exists public.pd_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pd_accounts(id) on delete cascade,
  reminder_month date not null check (extract(day from reminder_month) = 1),
  recipient_email text,
  recipient_key text generated always as (coalesce(lower(btrim(recipient_email)), '')) stored,
  status text not null check (status in ('sending','accepted','failed','skipped')),
  reason text,
  unpaid_due numeric(14,2) check (unpaid_due is null or unpaid_due >= 0),
  provider_message_id text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists pd_reminder_logs_account_month_recipient_idx
  on public.pd_reminder_logs(account_id, reminder_month, recipient_key);
create index if not exists pd_reminder_logs_workspace_attempted_idx
  on public.pd_reminder_logs(user_id, attempted_at desc);

alter table public.pd_reminder_logs enable row level security;
drop policy if exists "Workspace can read pd_reminder_logs" on public.pd_reminder_logs;
create policy "Workspace can read pd_reminder_logs" on public.pd_reminder_logs
  for select to authenticated using (public.pd_can_access_workspace(user_id));

revoke all on table public.pd_reminder_logs from anon, authenticated;
grant select on table public.pd_reminder_logs to authenticated;
grant select, insert, update on table public.pd_reminder_logs to service_role;

