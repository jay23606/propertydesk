-- Rollback-only integration test for security-deposit liability tracking.
begin;

create temporary table pd_deposit_test_ids (
  user_id uuid not null,
  outsider_id uuid not null,
  property_id uuid,
  rental_account_id uuid,
  note_account_id uuid
) on commit drop;
insert into pg_temp.pd_deposit_test_ids(user_id,outsider_id) values(gen_random_uuid(),gen_random_uuid());

do $$
declare
  ids record;
  v_property_id uuid;
  v_rental_account_id uuid;
  v_note_account_id uuid;
begin
  select * into ids from pg_temp.pd_deposit_test_ids;
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
    values(ids.user_id,'authenticated','authenticated',ids.user_id::text || '@example.test','',now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
    values(ids.outsider_id,'authenticated','authenticated',ids.outsider_id::text || '@example.test','',now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);
  perform set_config('request.jwt.claim.sub',ids.user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.user_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.user_id,'Deposit test','1 Ledger Way') returning id into v_property_id;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(ids.user_id,v_property_id,'rental','Deposit rental',date '2026-01-01',1000) returning id into v_rental_account_id;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(ids.user_id,v_property_id,'land_contract','Deposit note',date '2026-01-01',1000) returning id into v_note_account_id;
  perform set_config('request.jwt.claim.sub',ids.outsider_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids.outsider_id::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(ids.outsider_id,'Outsider test','2 Ledger Way');
  update pg_temp.pd_deposit_test_ids set property_id=v_property_id,rental_account_id=v_rental_account_id,note_account_id=v_note_account_id;
end;
$$;

grant select on pg_temp.pd_deposit_test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',user_id::text,true) from pg_temp.pd_deposit_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id::text,'role','authenticated')::text,true) from pg_temp.pd_deposit_test_ids;

do $$
declare
  ids record;
  held numeric(14,2);
  caught boolean;
  error_text text;
begin
  select * into ids from pg_temp.pd_deposit_test_ids;

  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,memo)
    values(ids.user_id,ids.rental_account_id,1000,date '2026-01-01','deposit','Deposit received');
  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,memo)
    values(ids.user_id,ids.rental_account_id,100,date '2026-01-02','rent','Rent is not a deposit');
  insert into public.pd_expenses(user_id,property_id,account_id,amount,expense_date,category,memo)
    values(ids.user_id,ids.property_id,ids.rental_account_id,250,date '2026-02-01','deposit_refund','Partial deposit refund');
  insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason)
    values(ids.user_id,ids.rental_account_id,'retained',100,date '2026-03-01','Documented damage');
  insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason)
    values(ids.user_id,ids.rental_account_id,'restored',25,date '2026-03-02','Retention reduced after review');

  select coalesce(sum(case when d.entry_type in ('received','restored') then d.amount else -d.amount end),0)
    into held from public.pd_deposit_entries d where d.account_id=ids.rental_account_id;
  if held<>675 then raise exception 'FAIL: expected held balance 675, got %',held; end if;
  if (select count(*) from public.pd_deposit_entries where account_id=ids.rental_account_id)<>4 then
    raise exception 'FAIL: rent receipt incorrectly created a deposit entry or a deposit movement is missing';
  end if;
  if (select count(*) from public.pd_audit_events where entity_type='pd_deposit_entries')<>4 then
    raise exception 'FAIL: deposit movements are missing audit records';
  end if;
  if exists(select 1 from public.pd_deposit_entries where user_id=ids.outsider_id) then
    raise exception 'FAIL: workspace user can see another workspace deposit rows';
  end if;

  caught:=false;
  begin
    insert into public.pd_expenses(user_id,property_id,account_id,amount,expense_date,category,memo)
      values(ids.user_id,ids.property_id,ids.rental_account_id,700,date '2026-04-01','deposit_refund','Excess refund');
    raise exception 'FAIL: refund above held balance was accepted';
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Refund exceeds the recorded held deposit balance' then caught:=true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: excess refund did not fail'; end if;

  caught:=false;
  begin
    insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason)
      values(ids.user_id,ids.rental_account_id,'retained',700,date '2026-04-02','Excess retention');
    raise exception 'FAIL: retention above held balance was accepted';
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Retention exceeds the recorded held deposit balance' then caught:=true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: excess retention did not fail'; end if;

  caught:=false;
  begin
    insert into public.pd_deposit_entries(user_id,account_id,entry_type,amount,movement_date,reason)
      values(ids.user_id,ids.rental_account_id,'restored',101,date '2026-04-03','Excess restoration');
    raise exception 'FAIL: restoration above retained amount was accepted';
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Retention reversal exceeds previously retained amounts' then caught:=true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: excess restoration did not fail'; end if;

  caught:=false;
  begin
    insert into public.pd_expenses(user_id,property_id,account_id,amount,expense_date,category,memo)
      values(ids.user_id,ids.property_id,ids.note_account_id,1,date '2026-04-04','deposit_refund','Wrong account type');
    raise exception 'FAIL: deposit refund was accepted for a loan account';
  exception when raise_exception then
    get stacked diagnostics error_text=message_text;
    if error_text='Security deposits can only be tracked for a rental account in this workspace' then caught:=true; else raise; end if;
  end;
  if not caught then raise exception 'FAIL: non-rental deposit refund did not fail'; end if;
end;
$$;

reset role;
rollback;
