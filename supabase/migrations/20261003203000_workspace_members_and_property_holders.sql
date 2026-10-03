-- Whole-workspace access for invited household members, plus property holder labels.
create table if not exists public.pd_workspace_members (
  workspace_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (workspace_id, member_user_id),
  unique (member_user_id),
  check (workspace_id <> member_user_id)
);
alter table public.pd_workspace_members enable row level security;
revoke all on table public.pd_workspace_members from public, anon, authenticated;
grant select on table public.pd_workspace_members to authenticated;

create or replace function public.pd_workspace_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.workspace_id from public.pd_workspace_members m where m.member_user_id = auth.uid() limit 1),
    auth.uid()
  )
$$;
create or replace function public.pd_can_access_workspace(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    p_workspace_id = auth.uid() or exists (
      select 1 from public.pd_workspace_members m
      where m.workspace_id = p_workspace_id and m.member_user_id = auth.uid()
    )
  )
$$;
revoke all on function public.pd_workspace_id() from public, anon;
revoke all on function public.pd_can_access_workspace(uuid) from public, anon;
grant execute on function public.pd_workspace_id() to authenticated;
grant execute on function public.pd_can_access_workspace(uuid) to authenticated;

drop policy if exists "pd workspace member visibility" on public.pd_workspace_members;
create policy "pd workspace member visibility" on public.pd_workspace_members
for select to authenticated using (public.pd_can_access_workspace(workspace_id));
revoke insert, update, delete on public.pd_workspace_members from anon, authenticated;

create or replace function public.pd_list_workspace_members()
returns table(member_user_id uuid, email text, display_name text, added_at timestamptz, is_owner boolean)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text, coalesce(nullif(u.raw_user_meta_data->>'display_name',''), u.email::text), now(), true
    from auth.users u where u.id = public.pd_workspace_id()
  union all
  select u.id, u.email::text, coalesce(nullif(u.raw_user_meta_data->>'display_name',''), u.email::text), m.added_at, false
    from public.pd_workspace_members m join auth.users u on u.id = m.member_user_id
   where m.workspace_id = public.pd_workspace_id()
  order by 5 desc, 2
$$;
create or replace function public.pd_add_workspace_member(p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := public.pd_workspace_id(); target_id uuid;
begin
  if auth.uid() is null or owner_id <> auth.uid() then raise exception 'Only the workspace owner can add members'; end if;
  select id into target_id from auth.users
   where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if target_id is null then raise exception 'That email needs a verified PropertyDesk account before it can be added'; end if;
  if target_id = owner_id then raise exception 'That account already owns this workspace'; end if;
  if exists(select 1 from public.pd_workspace_members where member_user_id=target_id)
     or exists(select 1 from public.pd_properties where user_id=target_id) then
    raise exception 'This account already has a workspace. A fresh account is needed to join another workspace.';
  end if;
  insert into public.pd_workspace_members(workspace_id, member_user_id) values(owner_id, target_id)
  on conflict (workspace_id, member_user_id) do nothing;
  return target_id;
end $$;
create or replace function public.pd_remove_workspace_member(p_member_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := public.pd_workspace_id();
begin
  if auth.uid() is null or owner_id <> auth.uid() then raise exception 'Only the workspace owner can remove members'; end if;
  delete from public.pd_property_holders where user_id=owner_id and member_user_id=p_member_user_id;
  delete from public.pd_workspace_members where workspace_id = owner_id and member_user_id = p_member_user_id;
end $$;
revoke all on function public.pd_list_workspace_members() from public, anon;
revoke all on function public.pd_add_workspace_member(text) from public, anon;
revoke all on function public.pd_remove_workspace_member(uuid) from public, anon;
grant execute on function public.pd_list_workspace_members() to authenticated;
grant execute on function public.pd_add_workspace_member(text) to authenticated;
grant execute on function public.pd_remove_workspace_member(uuid) to authenticated;

create table if not exists public.pd_property_holders (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.pd_properties(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, member_user_id)
);
alter table public.pd_property_holders enable row level security;
revoke all on table public.pd_property_holders from public, anon, authenticated;
grant select, insert, delete on table public.pd_property_holders to authenticated;
drop policy if exists "pd holders manage workspace properties" on public.pd_property_holders;
create policy "pd holders manage workspace properties" on public.pd_property_holders for all to authenticated
using (public.pd_can_access_workspace(user_id) and exists(select 1 from public.pd_properties p where p.id=property_id and p.user_id=user_id))
with check (
  public.pd_can_access_workspace(user_id)
  and exists(select 1 from public.pd_properties p where p.id=property_id and p.user_id=user_id)
  and (member_user_id=user_id or exists(select 1 from public.pd_workspace_members m where m.workspace_id=user_id and m.member_user_id=member_user_id))
);

create or replace function public.guard_propertydesk_user_id()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id is distinct from public.pd_workspace_id() then raise exception 'Record must belong to the active workspace'; end if;
  new.updated_at = now();
  return new;
end $$;

drop policy if exists "Users manage pd_properties" on public.pd_properties;
create policy "Users manage pd_properties" on public.pd_properties for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (
  user_id = public.pd_workspace_id() and (import_batch_id is null or exists(select 1 from public.pd_import_batches b where b.id=import_batch_id and b.user_id=user_id))
);
drop policy if exists "Users manage pd_accounts" on public.pd_accounts;
create policy "Users manage pd_accounts" on public.pd_accounts for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (
  user_id = public.pd_workspace_id() and exists(select 1 from public.pd_properties p where p.id=property_id and p.user_id=user_id)
  and (import_batch_id is null or exists(select 1 from public.pd_import_batches b where b.id=import_batch_id and b.user_id=user_id))
);
drop policy if exists "Users read pd_agreement_versions" on public.pd_agreement_versions;
create policy "Users read pd_agreement_versions" on public.pd_agreement_versions for select to authenticated using (public.pd_can_access_workspace(user_id));
drop policy if exists "Users manage pd_documents" on public.pd_documents;
create policy "Users manage pd_documents" on public.pd_documents for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (
  user_id=public.pd_workspace_id() and exists(select 1 from public.pd_properties p where p.id=property_id and p.user_id=user_id)
  and (account_id is null or exists(select 1 from public.pd_accounts a where a.id=account_id and a.user_id=user_id and a.property_id=property_id))
  and split_part(storage_path,'/',1)=user_id::text
);
drop policy if exists "Users read their private PropertyDesk files" on storage.objects;
create policy "Users read their private PropertyDesk files" on storage.objects for select to authenticated
using (bucket_id='pd-private-agreements' and public.pd_can_access_workspace(((storage.foldername(name))[1])::uuid));
drop policy if exists "Users upload their private PropertyDesk files" on storage.objects;
create policy "Users upload their private PropertyDesk files" on storage.objects for insert to authenticated
with check (bucket_id='pd-private-agreements' and (storage.foldername(name))[1]=public.pd_workspace_id()::text);
drop policy if exists "Users delete their private PropertyDesk files" on storage.objects;
create policy "Users delete their private PropertyDesk files" on storage.objects for delete to authenticated
using (bucket_id='pd-private-agreements' and public.pd_can_access_workspace(((storage.foldername(name))[1])::uuid));
drop policy if exists "Users manage pd_payments" on public.pd_payments;
create policy "Users manage pd_payments" on public.pd_payments for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (
  user_id=public.pd_workspace_id() and exists(select 1 from public.pd_accounts a where a.id=account_id and a.user_id=user_id)
  and (import_batch_id is null or exists(select 1 from public.pd_import_batches b where b.id=import_batch_id and b.user_id=user_id))
);
drop policy if exists "Users manage pd_expenses" on public.pd_expenses;
create policy "Users manage pd_expenses" on public.pd_expenses for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (
  user_id=public.pd_workspace_id() and exists(select 1 from public.pd_properties p where p.id=property_id and p.user_id=user_id)
  and (account_id is null or exists(select 1 from public.pd_accounts a where a.id=account_id and a.user_id=user_id and a.property_id=property_id))
  and (import_batch_id is null or exists(select 1 from public.pd_import_batches b where b.id=import_batch_id and b.user_id=user_id))
);
drop policy if exists "Users manage pd_import_batches" on public.pd_import_batches;
create policy "Users manage pd_import_batches" on public.pd_import_batches for all to authenticated
using (public.pd_can_access_workspace(user_id)) with check (user_id=public.pd_workspace_id());
drop policy if exists "Users can read pd_audit_events" on public.pd_audit_events;
create policy "Users can read pd_audit_events" on public.pd_audit_events for select to authenticated using (public.pd_can_access_workspace(user_id));

drop policy if exists "pd workspace audit visible" on public.pd_audit_events;
create policy "pd workspace audit visible" on public.pd_audit_events for select to authenticated using (public.pd_can_access_workspace(user_id));
drop policy if exists "pd workspace files update" on storage.objects;
create policy "pd workspace files update" on storage.objects for update to authenticated
using (bucket_id='pd-private-agreements' and public.pd_can_access_workspace(((storage.foldername(name))[1])::uuid))
with check (bucket_id='pd-private-agreements' and public.pd_can_access_workspace(((storage.foldername(name))[1])::uuid));

create or replace function public.pd_capture_agreement_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.pd_can_access_workspace(old.user_id) then raise exception 'Unauthorized terms update'; end if;
  if (to_jsonb(old) - array['id','user_id','created_at','updated_at','import_batch_id','agreement_effective_date','agreement_change_reason']::text[])
     is distinct from (to_jsonb(new) - array['id','user_id','created_at','updated_at','import_batch_id','agreement_effective_date','agreement_change_reason']::text[]) then
    insert into public.pd_agreement_versions(user_id,account_id,effective_from,replaced_on,reason,terms)
    values(old.user_id,old.id,coalesce(old.agreement_effective_date,old.start_date),coalesce(new.agreement_effective_date,current_date),
      left(coalesce(nullif(btrim(new.agreement_change_reason),''),'Terms updated'),500),to_jsonb(old));
  end if;
  return new;
end $$;

create or replace function public.pd_validate_payment_allocation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare account_row public.pd_accounts%rowtype;
begin
  select * into account_row from public.pd_accounts a where a.id=new.account_id and public.pd_can_access_workspace(a.user_id) and a.user_id=new.user_id;
  if not found then raise exception 'Payment account is outside the active workspace'; end if;
  if round(new.amount::numeric,2) <> round(new.principal_amount+new.interest_amount+new.fee_amount+new.unapplied_amount,2) then raise exception 'Payment allocations must sum to the received amount'; end if;
  return new;
end $$;

-- Existing transactional import RPCs already validate rows and insert atomically.
-- Route their owner_id values through the active workspace for invited members too.
do $$
declare fn regprocedure; definition text;
begin
  foreach fn in array array[
    'public.pd_import_propertydesk_accounts(jsonb,text,integer)'::regprocedure,
    'public.pd_import_propertydesk_transactions(text,jsonb,text,integer)'::regprocedure
  ] loop
    definition := pg_get_functiondef(fn);
    definition := replace(definition, 'auth.uid()', 'public.pd_workspace_id()');
    execute definition;
  end loop;
end $$;
