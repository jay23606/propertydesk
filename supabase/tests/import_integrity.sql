-- Rollback-only integration test for atomic CSV imports and workspace ownership.
-- Run against the linked project with:
--   supabase db query --linked --file supabase/tests/import_integrity.sql
begin;

create temporary table pd_import_test_ids (
  owner_id uuid not null,
  outsider_id uuid not null,
  owner_account_id uuid,
  owner_property_id uuid,
  outsider_account_id uuid
) on commit drop;
insert into pg_temp.pd_import_test_ids(owner_id, outsider_id)
values (gen_random_uuid(), gen_random_uuid());

do $$
declare
  ids record;
  owner_property uuid;
  owner_account uuid;
  outsider_property uuid;
  outsider_account uuid;
  result jsonb;
  batch_id uuid;
  starting_payment_count integer;
  caught boolean := false;
  error_text text;
begin
  select * into ids from pg_temp.pd_import_test_ids;
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
  values
    (ids.owner_id,'authenticated','authenticated',ids.owner_id::text || '@example.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb),
    (ids.outsider_id,'authenticated','authenticated',ids.outsider_id::text || '@example.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);

  perform set_config('request.jwt.claim.sub',ids.owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.owner_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.owner_id,'Import fixture','1 Import Way') returning id into owner_property;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(ids.owner_id,owner_property,'rental','Import fixture rental',date '2026-01-01',100) returning id into owner_account;

  perform set_config('request.jwt.claim.sub',ids.outsider_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.outsider_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.outsider_id,'Outsider fixture','2 Import Way') returning id into outsider_property;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(ids.outsider_id,outsider_property,'rental','Outsider rental',date '2026-01-01',100) returning id into outsider_account;
  update pg_temp.pd_import_test_ids
    set owner_account_id=owner_account,owner_property_id=owner_property,outsider_account_id=outsider_account;
end;
$$;

grant select on pg_temp.pd_import_test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',owner_id::text,true) from pg_temp.pd_import_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id::text,'role','authenticated')::text,true) from pg_temp.pd_import_test_ids;

do $$
declare
  ids record;
  result jsonb;
  batch_id uuid;
  owner_property uuid;
  owner_account uuid;
  starting_payment_count integer;
  caught boolean := false;
  error_text text;
begin
  select * into ids from pg_temp.pd_import_test_ids;

  result := public.pd_import_propertydesk_accounts(
    jsonb_build_array(
      jsonb_build_object('property_name','Imported home','property_address','10 CSV Way','account_type','rental','account_name','Imported rental A','party_name','Test occupant A','party_phone','555-0100','start_date','2026-01-01','payment_amount','850'),
      jsonb_build_object('property_name','Imported home','property_address','10 CSV Way','account_type','rental','account_name','Imported rental B','party_name','Test occupant B','start_date','2026-01-01','payment_amount','900')
    ), 'synthetic-accounts.csv', 3);
  batch_id := (result->>'batch_id')::uuid;
  if (result->>'rows_accepted')::integer <> 2 or (result->>'rows_rejected')::integer <> 1 then
    raise exception 'FAIL: account import returned incorrect row counts';
  end if;
  if (select count(*) from public.pd_properties where user_id=ids.owner_id and name='Imported home') <> 1 then
    raise exception 'FAIL: shared property row was duplicated during account import';
  end if;
  if (select count(*) from public.pd_accounts where user_id=ids.owner_id and import_batch_id=batch_id) <> 2 then
    raise exception 'FAIL: account import did not link both rows to its batch';
  end if;
  if not exists(select 1 from public.pd_import_batches where id=batch_id and status='committed' and rows_total=3 and rows_accepted=2 and rows_rejected=1) then
    raise exception 'FAIL: account import receipt is incomplete';
  end if;

  select id into owner_property from public.pd_properties where user_id=ids.owner_id and name='Imported home';
  select id into owner_account from public.pd_accounts where user_id=ids.owner_id and name='Imported rental A';
  if (select party_phone from public.pd_accounts where id=owner_account) <> '555-0100' then
    raise exception 'FAIL: account import did not preserve the tenant phone number';
  end if;
  result := public.pd_import_propertydesk_transactions('payments', jsonb_build_array(
    jsonb_build_object('account_id',owner_account,'amount','850','received_date','2026-02-01','income_category','rent','memo','synthetic payment')
  ), 'synthetic-payments.csv', 1);
  batch_id := (result->>'batch_id')::uuid;
  if (select count(*) from public.pd_payments where user_id=ids.owner_id and import_batch_id=batch_id and source_type='csv_import') <> 1 then
    raise exception 'FAIL: payment import was not committed with source metadata';
  end if;

  result := public.pd_import_propertydesk_transactions('expenses', jsonb_build_array(
    jsonb_build_object('property_id',owner_property,'account_id',owner_account,'amount','75','expense_date','2026-02-02','category','contractor','payee','Synthetic contractor')
  ), 'synthetic-expenses.csv', 1);
  batch_id := (result->>'batch_id')::uuid;
  if (select count(*) from public.pd_expenses where user_id=ids.owner_id and import_batch_id=batch_id and source_type='csv_import' and payee='Synthetic contractor') <> 1 then
    raise exception 'FAIL: expense import was not committed with source metadata';
  end if;

  select count(*) into starting_payment_count from public.pd_payments where user_id=ids.owner_id;
  caught := false;
  begin
    perform public.pd_import_propertydesk_transactions('payments', jsonb_build_array(
      jsonb_build_object('account_id',owner_account,'amount','10','received_date','2026-03-01','income_category','rent','memo','must rollback'),
      jsonb_build_object('account_id',owner_account,'amount','10','received_date','2026-03-02','income_category','invalid-category','memo','bad category')
    ), 'synthetic-failing-payments.csv', 2);
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Rental receipts must use a rental income category' then caught := true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: invalid transaction import did not fail'; end if;
  if (select count(*) from public.pd_payments where user_id=ids.owner_id) <> starting_payment_count then
    raise exception 'FAIL: a failed import left partial payment rows';
  end if;
  if exists(select 1 from public.pd_import_batches where user_id=ids.owner_id and source_name='synthetic-failing-payments.csv') then
    raise exception 'FAIL: a failed import left a partial batch receipt';
  end if;

  caught := false;
  begin
    perform public.pd_import_propertydesk_transactions('payments', jsonb_build_array(
      jsonb_build_object('account_id',ids.outsider_account_id,'amount','10','received_date','2026-03-03','income_category','rent')
    ), 'synthetic-cross-workspace.csv', 1);
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Payment account is outside the active workspace' then caught := true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: cross-workspace payment import was not rejected'; end if;
  if exists(select 1 from public.pd_import_batches where user_id=ids.owner_id and source_name='synthetic-cross-workspace.csv') then
    raise exception 'FAIL: rejected cross-workspace import left a batch receipt';
  end if;

  caught := false;
  begin
    perform public.pd_import_propertydesk_accounts(jsonb_build_array(
      jsonb_build_object('property_name','Atomic home','property_address','99 CSV Way','account_type','rental','account_name','First atomic row','start_date','2026-01-01','payment_amount','50'),
      jsonb_build_object('property_name','Atomic home','property_address','99 CSV Way','account_type','not-valid','account_name','Invalid row','start_date','2026-01-01','payment_amount','50')
    ), 'synthetic-failing-accounts.csv', 2);
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: invalid account import did not fail'; end if;
  if exists(select 1 from public.pd_properties where user_id=ids.owner_id and name='Atomic home')
     or exists(select 1 from public.pd_accounts where user_id=ids.owner_id and name in ('First atomic row','Invalid row'))
     or exists(select 1 from public.pd_import_batches where user_id=ids.owner_id and source_name='synthetic-failing-accounts.csv') then
    raise exception 'FAIL: failed account import left partial properties, accounts, or batch receipt';
  end if;
end;
$$;

reset role;
rollback;
