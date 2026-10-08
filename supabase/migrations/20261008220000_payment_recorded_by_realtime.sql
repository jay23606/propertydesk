alter table public.pd_payments
  add column if not exists recorded_by uuid references auth.users(id) on delete set null;

alter table public.pd_payments
  alter column recorded_by set default auth.uid();

create or replace function public.pd_set_payment_recorder()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.recorded_by := auth.uid();
  return new;
end $$;

drop trigger if exists pd_payments_set_recorder on public.pd_payments;
create trigger pd_payments_set_recorder before insert on public.pd_payments
for each row execute function public.pd_set_payment_recorder();

do $$
begin
  alter publication supabase_realtime add table public.pd_payments;
exception
  when duplicate_object then null;
end;
$$;
