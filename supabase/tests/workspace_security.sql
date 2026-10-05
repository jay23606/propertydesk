-- Rollback-only RLS regression test. Run against the linked project with:
--   supabase db query --linked --file supabase/tests/workspace_security.sql
begin;

create temporary table pd_workspace_security_test_ids (
  owner_id uuid not null,
  member_id uuid not null,
  outsider_id uuid not null,
  owner_property_id uuid,
  owner_account_id uuid,
  outsider_property_id uuid,
  owner_storage_name text
) on commit drop;
insert into pg_temp.pd_workspace_security_test_ids(owner_id,member_id,outsider_id)
values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());

do $$
declare
  ids record;
  v_owner_property_id uuid;
  v_owner_account_id uuid;
  v_outsider_property_id uuid;
  v_owner_storage_name text;
begin
  select * into ids from pg_temp.pd_workspace_security_test_ids;
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
  values
    (ids.owner_id,'authenticated','authenticated',ids.owner_id::text || '@example.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb),
    (ids.member_id,'authenticated','authenticated',ids.member_id::text || '@example.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb),
    (ids.outsider_id,'authenticated','authenticated',ids.outsider_id::text || '@example.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);
  insert into public.pd_workspace_members(workspace_id,member_user_id) values(ids.owner_id,ids.member_id);

  perform set_config('request.jwt.claim.sub',ids.owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.owner_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.owner_id,'Owner property','1 Workspace Way') returning id into v_owner_property_id;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(ids.owner_id,v_owner_property_id,'rental','Owner rental',date '2026-01-01',100) returning id into v_owner_account_id;
  if (select monthly_reminder_enabled from public.pd_accounts where id=v_owner_account_id) then raise exception 'FAIL: new account reminder toggle was not off by default'; end if;
  insert into public.pd_import_batches(user_id,source_type,source_name,status,rows_total,rows_accepted)
    values(ids.owner_id,'csv','synthetic-private-import.csv','committed',1,1);
  insert into public.pd_documents(user_id,property_id,account_id,file_name,storage_path,content_type,file_size)
    values(ids.owner_id,v_owner_property_id,v_owner_account_id,'synthetic-private-agreement.pdf',ids.owner_id::text || '/' || v_owner_property_id::text || '/synthetic-private-agreement.pdf','application/pdf',128);
  v_owner_storage_name := ids.owner_id::text || '/' || v_owner_property_id::text || '/synthetic-private-agreement.pdf';
  insert into storage.objects(bucket_id,name,owner_id,metadata)
    values('pd-private-agreements',v_owner_storage_name,ids.owner_id::text,'{"mimetype":"application/pdf","size":128}'::jsonb);
  insert into public.pd_property_holders(user_id,property_id,member_user_id)
    values(ids.owner_id,v_owner_property_id,ids.member_id);
  insert into public.pd_reminder_logs(user_id,account_id,reminder_month,recipient_email,status,reason,unpaid_due)
    values(ids.owner_id,v_owner_account_id,date '2026-10-01','tenant@example.test','accepted',null,100);
  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category)
    values(ids.owner_id,v_owner_account_id,100,date '2026-10-01','rent');
  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category)
    values(ids.owner_id,v_owner_account_id,5,date '2026-10-02','deposit');
  insert into public.pd_expenses(user_id,property_id,amount,expense_date,category)
    values(ids.owner_id,v_owner_property_id,25,date '2026-10-02','repairs');
  update public.pd_accounts set party_name='Synthetic Buyer',party_email='synthetic-buyer@example.test',agreement_change_reason='synthetic RLS test'
    where id=v_owner_account_id;

  perform set_config('request.jwt.claim.sub',ids.outsider_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.outsider_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.outsider_id,'Other workspace property','2 Workspace Way') returning id into v_outsider_property_id;
  update pg_temp.pd_workspace_security_test_ids
    set owner_property_id=v_owner_property_id,owner_account_id=v_owner_account_id,outsider_property_id=v_outsider_property_id,owner_storage_name=v_owner_storage_name;
end;
$$;

grant select on pg_temp.pd_workspace_security_test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',member_id::text,true) from pg_temp.pd_workspace_security_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',member_id::text,'role','authenticated')::text,true) from pg_temp.pd_workspace_security_test_ids;

do $$
declare
  ids record;
  affected integer;
begin
  select * into ids from pg_temp.pd_workspace_security_test_ids;
  if public.pd_workspace_id() <> ids.owner_id then raise exception 'FAIL: member did not resolve to the owner workspace'; end if;
  if (select count(*) from public.pd_properties where id=ids.owner_property_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared property'; end if;
  if (select count(*) from public.pd_accounts where id=ids.owner_account_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared account and contact data'; end if;
  if (select count(*) from public.pd_list_workspace_members()) <> 2 then raise exception 'FAIL: member list exposed the wrong workspace members'; end if;
  if (select count(*) from public.pd_payments where account_id=ids.owner_account_id) <> 2 then raise exception 'FAIL: workspace member cannot read shared payments'; end if;
  if (select count(*) from public.pd_expenses where property_id=ids.owner_property_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared expenses'; end if;
  if (select count(*) from public.pd_agreement_versions where account_id=ids.owner_account_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared agreement history'; end if;
  if (select count(*) from public.pd_documents where property_id=ids.owner_property_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared document metadata'; end if;
  if (select count(*) from storage.objects where bucket_id='pd-private-agreements' and name=ids.owner_storage_name) <> 1 then raise exception 'FAIL: workspace member cannot read shared private agreement object'; end if;
  if (select count(*) from public.pd_import_batches where user_id=ids.owner_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared import history'; end if;
  if (select count(*) from public.pd_deposit_entries where account_id=ids.owner_account_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared deposit history'; end if;
  if (select count(*) from public.pd_property_holders where property_id=ids.owner_property_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared property-holder labels'; end if;
  if (select count(*) from public.pd_audit_events where user_id=ids.owner_id and entity_id=ids.owner_property_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared audit history'; end if;
  if (select count(*) from public.pd_reminder_logs where account_id=ids.owner_account_id) <> 1 then raise exception 'FAIL: workspace member cannot read shared reminder activity'; end if;
  if (select count(*) from public.pd_properties where id=ids.outsider_property_id) <> 0 then raise exception 'FAIL: workspace member can read another workspace'; end if;

  update public.pd_properties set notes='Updated by a workspace member' where id=ids.owner_property_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: workspace member cannot update shared workspace data'; end if;

  begin
    perform public.pd_add_workspace_member(ids.outsider_id::text || '@example.test');
    raise exception 'FAIL: non-owner added a workspace member';
  exception when raise_exception then
    if sqlerrm <> 'Only the workspace owner can add members' then raise; end if;
  end;
  begin
    perform public.pd_remove_workspace_member(ids.outsider_id);
    raise exception 'FAIL: non-owner removed a workspace member';
  exception when raise_exception then
    if sqlerrm <> 'Only the workspace owner can remove members' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub',ids.outsider_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.outsider_id::text,'role','authenticated')::text,true);
  if public.pd_workspace_id() <> ids.outsider_id then raise exception 'FAIL: unrelated user resolved to the wrong workspace'; end if;
  if (select count(*) from public.pd_properties where id=ids.owner_property_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace'; end if;
  if (select count(*) from public.pd_accounts where id=ids.owner_account_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace account and contact data'; end if;
  if (select count(*) from public.pd_list_workspace_members()) <> 1 then raise exception 'FAIL: unrelated user can list another workspace members'; end if;
  if (select count(*) from public.pd_payments where account_id=ids.owner_account_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace payments'; end if;
  if (select count(*) from public.pd_expenses where property_id=ids.owner_property_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace expenses'; end if;
  if (select count(*) from public.pd_agreement_versions where account_id=ids.owner_account_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace agreement history'; end if;
  if (select count(*) from public.pd_documents where property_id=ids.owner_property_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace document metadata'; end if;
  if (select count(*) from storage.objects where bucket_id='pd-private-agreements' and name=ids.owner_storage_name) <> 0 then raise exception 'FAIL: unrelated user can read another workspace private agreement object'; end if;
  if (select count(*) from public.pd_import_batches where user_id=ids.owner_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace import history'; end if;
  if (select count(*) from public.pd_deposit_entries where account_id=ids.owner_account_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace deposit history'; end if;
  if (select count(*) from public.pd_property_holders where property_id=ids.owner_property_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace property-holder labels'; end if;
  if (select count(*) from public.pd_audit_events where user_id=ids.owner_id and entity_id=ids.owner_property_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace audit history'; end if;
  if (select count(*) from public.pd_reminder_logs where account_id=ids.owner_account_id) <> 0 then raise exception 'FAIL: unrelated user can read another workspace reminder activity'; end if;

  begin
    insert into public.pd_payments(user_id,account_id,amount,received_date,income_category)
      values(ids.outsider_id,ids.owner_account_id,100,date '2026-10-03','rent');
    raise exception 'FAIL: unrelated user wrote to another workspace account';
  exception when others then
    if sqlerrm = 'FAIL: unrelated user wrote to another workspace account' then raise; end if;
  end;
end;
$$;

reset role;
rollback;
