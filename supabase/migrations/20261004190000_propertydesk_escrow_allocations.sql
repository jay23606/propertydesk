alter table public.pd_accounts
  add column if not exists escrow_amount numeric(14,2) not null default 0 check (escrow_amount >= 0);

alter table public.pd_payments
  add column if not exists escrow_amount numeric(14,2) not null default 0 check (escrow_amount >= 0);

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
    'principal_interest_amount',old.principal_interest_amount,'escrow_amount',old.escrow_amount,
    'ledger_opening_balance',old.ledger_opening_balance,'ledger_opening_date',old.ledger_opening_date,
    'interest_rate',old.interest_rate,'term_months',old.term_months,'balloon_date',old.balloon_date,
    'late_fee',old.late_fee,'grace_days',old.grace_days,'notes',old.notes
  ) is distinct from jsonb_build_object(
    'property_id',new.property_id,'account_type',new.account_type,'name',new.name,
    'party_name',new.party_name,'party_email',new.party_email,'start_date',new.start_date,
    'next_due_date',new.next_due_date,'payment_amount',new.payment_amount,
    'payment_frequency',new.payment_frequency,'original_principal',new.original_principal,
    'principal_interest_amount',new.principal_interest_amount,'escrow_amount',new.escrow_amount,
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

create or replace function public.pd_correct_transaction(
  p_kind text,
  p_transaction_id uuid,
  p_correction jsonb,
  p_reason text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  workspace_id uuid := public.pd_workspace_id();
  correction_reason text := left(nullif(btrim(p_reason), ''), 500);
  replacement_id uuid;
  original_payment public.pd_payments%rowtype;
  original_expense public.pd_expenses%rowtype;
begin
  if auth.uid() is null or workspace_id is null then raise exception 'Authentication required'; end if;
  if p_correction is null or jsonb_typeof(p_correction) <> 'object' then raise exception 'Correction data is required'; end if;
  if correction_reason is null then raise exception 'Enter a reason for this correction'; end if;

  if p_kind = 'payment' then
    select * into original_payment from public.pd_payments where id=p_transaction_id and user_id=workspace_id for update;
    if not found then raise exception 'Payment was not found in this workspace'; end if;
    if original_payment.status <> 'posted' then raise exception 'Only posted payments can be corrected'; end if;
    if exists(select 1 from public.pd_payments where correction_of_payment_id=p_transaction_id) then raise exception 'This payment already has a correction'; end if;
    update public.pd_payments set status='voided',void_reason='Corrected: ' || correction_reason where id=p_transaction_id;
    insert into public.pd_payments(user_id,account_id,amount,received_date,payment_method,income_category,
      principal_amount,interest_amount,fee_amount,escrow_amount,unapplied_amount,memo,source_type,import_batch_id,correction_of_payment_id)
    values(workspace_id,(p_correction->>'account_id')::uuid,(p_correction->>'amount')::numeric,
      (p_correction->>'received_date')::date,coalesce(nullif(p_correction->>'payment_method',''),'manual'),
      coalesce(nullif(p_correction->>'income_category',''),'installment'),
      coalesce(nullif(p_correction->>'principal_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'interest_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'fee_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'escrow_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'unapplied_amount','')::numeric,0),nullif(p_correction->>'memo',''),
      'other',original_payment.import_batch_id,p_transaction_id) returning id into replacement_id;
  elsif p_kind = 'expense' then
    select * into original_expense from public.pd_expenses where id=p_transaction_id and user_id=workspace_id for update;
    if not found then raise exception 'Expense was not found in this workspace'; end if;
    if original_expense.status <> 'posted' then raise exception 'Only posted expenses can be corrected'; end if;
    if exists(select 1 from public.pd_expenses where correction_of_expense_id=p_transaction_id) then raise exception 'This expense already has a correction'; end if;
    update public.pd_expenses set status='voided',void_reason='Corrected: ' || correction_reason where id=p_transaction_id;
    insert into public.pd_expenses(user_id,property_id,account_id,amount,expense_date,category,payee,
      payment_method,memo,source_type,import_batch_id,correction_of_expense_id)
    values(workspace_id,(p_correction->>'property_id')::uuid,nullif(p_correction->>'account_id','')::uuid,
      (p_correction->>'amount')::numeric,(p_correction->>'expense_date')::date,
      coalesce(nullif(p_correction->>'category',''),'other'),nullif(p_correction->>'payee',''),
      coalesce(nullif(p_correction->>'payment_method',''),'manual'),nullif(p_correction->>'memo',''),
      'other',original_expense.import_batch_id,p_transaction_id) returning id into replacement_id;
  else
    raise exception 'Correction type must be payment or expense';
  end if;
  return replacement_id;
end;
$$;

create or replace function public.pd_validate_payment_allocation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  account_row public.pd_accounts%rowtype;
begin
  select * into account_row
    from public.pd_accounts a
   where a.id = new.account_id
     and public.pd_can_access_workspace(a.user_id)
     and a.user_id = new.user_id;
  if not found then raise exception 'Payment account is outside the active workspace'; end if;

  if account_row.account_type = 'rental' then
    if new.principal_amount <> 0 or new.interest_amount <> 0 or new.fee_amount <> 0 or new.escrow_amount <> 0 or new.unapplied_amount <> 0 then
      raise exception 'Rental receipts cannot carry loan allocations';
    end if;
    if new.income_category not in ('rent','late_fee','deposit','other') then
      raise exception 'Rental receipts must use a rental income category';
    end if;
  else
    if new.income_category not in ('installment','late_fee','other') then
      raise exception 'Financing receipts must use a financing income category';
    end if;
    if round(new.amount::numeric,2) <> round(new.principal_amount + new.interest_amount + new.fee_amount + new.escrow_amount + new.unapplied_amount,2) then
      raise exception 'Loan payment allocations must sum to the amount received';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.pd_import_propertydesk_accounts(p_rows jsonb, p_source_name text, p_rows_total integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  property_id uuid;
  batch_id uuid;
  inserted_count integer := 0;
  total_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'An account import must contain at least one row';
  end if;
  total_count := coalesce(p_rows_total, jsonb_array_length(p_rows));
  if jsonb_array_length(p_rows) > 500 or total_count > 500 then raise exception 'Import is limited to 500 accounts'; end if;
  if total_count < jsonb_array_length(p_rows) then raise exception 'Total CSV rows cannot be less than accepted rows'; end if;
  insert into public.pd_import_batches(user_id, source_type, source_name, status, rows_total)
    values (auth.uid(), 'csv', left(coalesce(nullif(btrim(p_source_name), ''), 'Accounts CSV'), 255), 'staged', total_count)
    returning id into batch_id;

  for item in
    select distinct on (lower(value->>'property_name'), lower(value->>'property_address')) value
    from jsonb_array_elements(p_rows) as source(value)
    order by lower(value->>'property_name'), lower(value->>'property_address')
  loop
    select p.id into property_id from public.pd_properties p
      where lower(p.name) = lower(item->>'property_name')
        and lower(p.address) = lower(item->>'property_address')
      limit 1;
    if property_id is null then
       insert into public.pd_properties(user_id, name, address, city, state, postal_code, property_kind, import_batch_id)
       values (auth.uid(), item->>'property_name', item->>'property_address',
         nullif(item->>'city',''), nullif(item->>'state',''), nullif(item->>'postal_code',''),
         coalesce(nullif(item->>'property_kind',''), 'residential'), batch_id)
      returning id into property_id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_rows) as source(value)
  loop
    select p.id into property_id from public.pd_properties p
      where lower(p.name) = lower(item->>'property_name')
        and lower(p.address) = lower(item->>'property_address')
      limit 1;
    if property_id is null then raise exception 'Property was not created or is not visible to this user'; end if;
    insert into public.pd_accounts(user_id, property_id, account_type, name, party_name, party_email,
      start_date, next_due_date, payment_amount, payment_frequency, original_principal, principal_interest_amount, escrow_amount,
      ledger_opening_balance, ledger_opening_date,
      interest_rate, term_months, balloon_date, late_fee, grace_days, notes, import_batch_id)
    values (auth.uid(), property_id, item->>'account_type', item->>'account_name',
      nullif(item->>'party_name',''), nullif(item->>'party_email',''), (item->>'start_date')::date,
      nullif(item->>'next_due_date','')::date,
      coalesce(nullif(item->>'payment_amount','')::numeric, 0),
      coalesce(nullif(item->>'payment_frequency',''), 'monthly'),
      coalesce(nullif(item->>'original_principal','')::numeric, 0),
      nullif(item->>'principal_interest_amount','')::numeric,
      coalesce(nullif(item->>'escrow_amount','')::numeric, 0),
      nullif(item->>'ledger_opening_balance','')::numeric,
      nullif(item->>'ledger_opening_date','')::date,
      coalesce(nullif(item->>'interest_rate','')::numeric, 0),
      nullif(item->>'term_months','')::integer, nullif(item->>'balloon_date','')::date,
      coalesce(nullif(item->>'late_fee','')::numeric, 0),
      coalesce(nullif(item->>'grace_days','')::integer, 0), nullif(item->>'notes',''), batch_id);
    inserted_count := inserted_count + 1;
  end loop;
  update public.pd_import_batches set status = 'committed', rows_accepted = inserted_count, rows_rejected = total_count - inserted_count, committed_at = now() where id = batch_id;
  return jsonb_build_object('batch_id', batch_id, 'rows_total', total_count, 'rows_accepted', inserted_count, 'rows_rejected', total_count - inserted_count);
end;
$$;

create or replace function public.pd_import_propertydesk_transactions(p_kind text, p_rows jsonb, p_source_name text, p_rows_total integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  batch_id uuid;
  inserted_count integer := 0;
  row_count integer;
  total_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_kind is null or p_kind not in ('payments','expenses') then raise exception 'Import type must be payments or expenses'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'An import must contain at least one row';
  end if;
  row_count := jsonb_array_length(p_rows);
  total_count := coalesce(p_rows_total, row_count);
  if row_count > 500 or total_count > 500 then raise exception 'Import is limited to 500 rows'; end if;
  if total_count < row_count then raise exception 'Total CSV rows cannot be less than accepted rows'; end if;

  insert into public.pd_import_batches(user_id, source_type, source_name, status, rows_total)
    values (auth.uid(), 'csv', left(coalesce(nullif(btrim(p_source_name), ''), 'Transactions CSV'), 255), 'staged', total_count)
    returning id into batch_id;

  for item in select value from jsonb_array_elements(p_rows) as source(value)
  loop
    if p_kind = 'payments' then
      insert into public.pd_payments(user_id, account_id, amount, received_date, payment_method,
        income_category, principal_amount, interest_amount, fee_amount, escrow_amount, unapplied_amount,
        memo, source_type, import_batch_id)
      values (auth.uid(), (item->>'account_id')::uuid, (item->>'amount')::numeric,
        (item->>'received_date')::date, coalesce(nullif(item->>'payment_method',''), 'manual'),
        coalesce(nullif(item->>'income_category',''), 'installment'),
        coalesce(nullif(item->>'principal_amount','')::numeric, 0),
        coalesce(nullif(item->>'interest_amount','')::numeric, 0),
        coalesce(nullif(item->>'fee_amount','')::numeric, 0),
        coalesce(nullif(item->>'escrow_amount','')::numeric, 0),
        coalesce(nullif(item->>'unapplied_amount','')::numeric, 0),
        nullif(item->>'memo',''), 'csv_import', batch_id);
    else
      insert into public.pd_expenses(user_id, property_id, account_id, amount, expense_date,
        category, payee, payment_method, memo, source_type, import_batch_id)
      values (auth.uid(), (item->>'property_id')::uuid, nullif(item->>'account_id','')::uuid,
        (item->>'amount')::numeric, (item->>'expense_date')::date,
        coalesce(nullif(item->>'category',''), 'other'), nullif(item->>'payee',''),
        coalesce(nullif(item->>'payment_method',''), 'manual'), nullif(item->>'memo',''),
        'csv_import', batch_id);
    end if;
    inserted_count := inserted_count + 1;
  end loop;

  update public.pd_import_batches set status = 'committed', rows_accepted = inserted_count, rows_rejected = total_count - inserted_count, committed_at = now() where id = batch_id;
  return jsonb_build_object('batch_id', batch_id, 'rows_total', total_count, 'rows_accepted', inserted_count, 'rows_rejected', total_count - inserted_count);
end;
$$;

revoke all on function public.pd_capture_agreement_version() from public, anon, authenticated;
revoke all on function public.pd_correct_transaction(text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.pd_correct_transaction(text,uuid,jsonb,text) to authenticated;
revoke all on function public.pd_import_propertydesk_accounts(jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.pd_import_propertydesk_accounts(jsonb, text, integer) to authenticated;
revoke all on function public.pd_import_propertydesk_transactions(text, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.pd_import_propertydesk_transactions(text, jsonb, text, integer) to authenticated;
