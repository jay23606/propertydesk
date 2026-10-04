alter table public.pd_accounts add column if not exists party_phone text;

create or replace function public.pd_capture_agreement_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or old.user_id is distinct from auth.uid() then
    raise exception 'Authenticated account owner required to change agreement terms';
  end if;
  if jsonb_build_object(
    'property_id',old.property_id,'account_type',old.account_type,'name',old.name,
    'party_name',old.party_name,'party_email',old.party_email,'party_phone',old.party_phone,'start_date',old.start_date,
    'next_due_date',old.next_due_date,'payment_amount',old.payment_amount,
    'payment_frequency',old.payment_frequency,'original_principal',old.original_principal,
    'principal_interest_amount',old.principal_interest_amount,'escrow_amount',old.escrow_amount,
    'ledger_opening_balance',old.ledger_opening_balance,'ledger_opening_date',old.ledger_opening_date,
    'interest_rate',old.interest_rate,'term_months',old.term_months,'balloon_date',old.balloon_date,
    'late_fee',old.late_fee,'grace_days',old.grace_days,'notes',old.notes
  ) is distinct from jsonb_build_object(
    'property_id',new.property_id,'account_type',new.account_type,'name',new.name,
    'party_name',new.party_name,'party_email',new.party_email,'party_phone',new.party_phone,'start_date',new.start_date,
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
    insert into public.pd_accounts(user_id, property_id, account_type, name, party_name, party_email, party_phone,
      start_date, next_due_date, payment_amount, payment_frequency, original_principal, principal_interest_amount, escrow_amount,
      ledger_opening_balance, ledger_opening_date,
      interest_rate, term_months, balloon_date, late_fee, grace_days, notes, import_batch_id)
    values (auth.uid(), property_id, item->>'account_type', item->>'account_name',
      nullif(item->>'party_name',''), nullif(item->>'party_email',''), nullif(item->>'party_phone',''), (item->>'start_date')::date,
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
