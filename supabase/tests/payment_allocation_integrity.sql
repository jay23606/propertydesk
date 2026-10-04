begin;

do $$
declare
  test_user uuid := gen_random_uuid();
  rental_property uuid;
  rental_account uuid;
  note_account uuid;
  expected_error text;
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
  values(test_user,'authenticated','authenticated',test_user::text || '@example.test','',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb);
  perform set_config('request.jwt.claim.sub',test_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_user::text,'role','authenticated')::text,true);

  insert into public.pd_properties(user_id,name,address) values(test_user,'Test property','1 Test Way') returning id into rental_property;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(test_user,rental_property,'rental','Test rental',date '2026-01-01',100) returning id into rental_account;
  insert into public.pd_accounts(user_id,property_id,account_type,name,start_date,payment_amount)
    values(test_user,rental_property,'land_contract','Test note',date '2026-01-01',200) returning id into note_account;

  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category)
    values(test_user,rental_account,100,date '2026-10-01','deposit');

  begin
    insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,principal_amount)
      values(test_user,rental_account,100,date '2026-10-02','rent',100);
    raise exception 'FAIL: rental allocation was accepted';
  exception when raise_exception then
    get stacked diagnostics expected_error = message_text;
    if expected_error <> 'Rental receipts cannot carry loan allocations' then raise; end if;
  end;

  begin
    insert into public.pd_payments(user_id,account_id,amount,received_date,income_category)
      values(test_user,rental_account,100,date '2026-10-03','installment');
    raise exception 'FAIL: financing category was accepted for a rental';
  exception when raise_exception then
    get stacked diagnostics expected_error = message_text;
    if expected_error <> 'Rental receipts must use a rental income category' then raise; end if;
  end;

  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,principal_amount,interest_amount)
    values(test_user,note_account,200,date '2026-10-01','installment',150,50);

  insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,principal_amount,interest_amount,escrow_amount)
    values(test_user,note_account,750,date '2026-10-04','installment',25.22,574.78,150);

  begin
    insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,principal_amount)
      values(test_user,note_account,200,date '2026-10-02','installment',100);
    raise exception 'FAIL: incomplete loan allocation was accepted';
  exception when raise_exception then
    get stacked diagnostics expected_error = message_text;
    if expected_error <> 'Loan payment allocations must sum to the amount received' then raise; end if;
  end;

  begin
    insert into public.pd_payments(user_id,account_id,amount,received_date,income_category,principal_amount,interest_amount)
      values(test_user,note_account,200,date '2026-10-03','rent',150,50);
    raise exception 'FAIL: rental category was accepted for financing';
  exception when raise_exception then
    get stacked diagnostics expected_error = message_text;
    if expected_error <> 'Financing receipts must use a financing income category' then raise; end if;
  end;
end;
$$;

rollback;
