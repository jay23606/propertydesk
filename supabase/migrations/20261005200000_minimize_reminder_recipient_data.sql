alter table public.pd_reminder_logs
  add column if not exists recipient_index integer;

with numbered_recipients as (
  select id,
    case
      when nullif(btrim(recipient_email), '') is null then 0
      else row_number() over (
        partition by account_id, reminder_month
        order by lower(btrim(recipient_email)), id
      )::integer
    end as recipient_index
  from public.pd_reminder_logs
)
update public.pd_reminder_logs as logs
set recipient_index = numbered_recipients.recipient_index
from numbered_recipients
where logs.id = numbered_recipients.id
  and logs.recipient_index is null;

alter table public.pd_reminder_logs
  alter column recipient_index set default 0,
  alter column recipient_index set not null;
alter table public.pd_reminder_logs
  add constraint pd_reminder_logs_recipient_index_nonnegative
  check (recipient_index >= 0);

drop index if exists public.pd_reminder_logs_account_month_recipient_idx;
create unique index pd_reminder_logs_account_month_recipient_idx
  on public.pd_reminder_logs(account_id, reminder_month, recipient_index);

alter table public.pd_reminder_logs drop column if exists recipient_key;
alter table public.pd_reminder_logs drop column if exists recipient_email;

comment on column public.pd_reminder_logs.recipient_index is
  'Ordinal in the account contact list at send time; stores no recipient email.';
