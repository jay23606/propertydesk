-- Rollback-only integration test for atomic transaction corrections.
begin;

create temporary table pd_correction_test_ids (
  user_id uuid not null,
  account_id uuid,
  property_id uuid,
  payment_id uuid,
  expense_id uuid
) on commit drop;
insert into pg_temp.pd_correction_test_ids(user_id) values(gen_random_uuid());

do $$
declare
  test_user uuid;
  test_property uuid;
  test_account uuid;
  test_payment uuid;
  test_expense uuid;
begin
  select user_id into test_user from pg_temp.pd_correction_test_ids;
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
    values(test_user,'authenticated','authenticated',test_user::text || '@example.test','',now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);
  perform set_config('request.jwt.claim.sub',test_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_user::text,'role','authenticated')::text,true);
  insert into public.pd_properties(user_id,name,address)
    values(test_user,'Correction test','3 Ledger Way') returning id into test_property;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(test_user,test_property,'rental','Correction rental',date '2026-01-01',100) returning id into test_account;
  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,memo)
    values(test_user,test_account,100,date '2026-09-01','rent','Original payment') returning id into test_payment;
  insert into public.pd_expenses(user_id,property_id,amount,expense_date,category,memo)
    values(test_user,test_property,25,date '2026-09-02','repairs','Original expense') returning id into test_expense;
  update pg_temp.pd_correction_test_ids
    set account_id=test_account,property_id=test_property,payment_id=test_payment,expense_id=test_expense;
end;
$$;

grant select on pg_temp.pd_correction_test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',user_id::text,true) from pg_temp.pd_correction_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id::text,'role','authenticated')::text,true) from pg_temp.pd_correction_test_ids;

do $$
declare
  ids record;
  replacement_id uuid;
  caught boolean := false;
begin
  select * into ids from pg_temp.pd_correction_test_ids;
  replacement_id := public.pd_correct_transaction('payment',ids.payment_id,
    jsonb_build_object('account_id',ids.account_id,'amount',90,'received_date','2026-09-03',
      'payment_method','check','income_category','rent','principal_amount',0,'interest_amount',0,
      'fee_amount',0,'unapplied_amount',0,'memo','Corrected payment'),'Wrong amount/date');
  if (select status from public.pd_payments where id=ids.payment_id) <> 'voided' then raise exception 'FAIL: original payment was not voided'; end if;
  if (select void_reason from public.pd_payments where id=ids.payment_id) <> 'Corrected: Wrong amount/date' then raise exception 'FAIL: correction reason was not retained'; end if;
  if not exists(select 1 from public.pd_payments where id=replacement_id and correction_of_payment_id=ids.payment_id and amount=90 and received_date=date '2026-09-03') then raise exception 'FAIL: linked payment replacement was not recorded'; end if;
  if (select count(*) from public.pd_audit_events where entity_id in (ids.payment_id,replacement_id)) < 2 then raise exception 'FAIL: before/after audit events were not recorded'; end if;

  begin
    perform public.pd_correct_transaction('expense',ids.expense_id,
      jsonb_build_object('property_id',ids.property_id,'amount',-1,'expense_date','2026-09-04','category','repairs'),
      'Invalid replacement must roll back');
    raise exception 'FAIL: invalid corrected expense was accepted';
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: invalid correction did not report a constraint violation'; end if;
  if (select status from public.pd_expenses where id=ids.expense_id) <> 'posted' then raise exception 'FAIL: failed correction did not roll back original void'; end if;

  replacement_id := public.pd_correct_transaction('expense',ids.expense_id,
    jsonb_build_object('property_id',ids.property_id,'account_id',null,'amount',35,'expense_date','2026-09-04',
      'category','repairs','payee','Test contractor','payment_method','check','memo','Corrected expense'),
    'Added a missing contractor charge');
  if (select status from public.pd_expenses where id=ids.expense_id) <> 'voided' then raise exception 'FAIL: original expense was not voided'; end if;
  if not exists(select 1 from public.pd_expenses where id=replacement_id and correction_of_expense_id=ids.expense_id and amount=35 and payee='Test contractor') then raise exception 'FAIL: linked expense replacement was not recorded'; end if;
  if (select count(*) from public.pd_audit_events where entity_id in (ids.expense_id,replacement_id)) < 2 then raise exception 'FAIL: expense correction audit events were not recorded'; end if;
end;
$$;

reset role;
rollback;
