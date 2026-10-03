-- Correct a posted payment or expense by voiding the original and inserting a linked replacement atomically.
alter table public.pd_payments
  add column if not exists correction_of_payment_id uuid references public.pd_payments(id);
alter table public.pd_expenses
  add column if not exists correction_of_expense_id uuid references public.pd_expenses(id);

create unique index if not exists pd_payments_one_correction_idx
  on public.pd_payments(correction_of_payment_id) where correction_of_payment_id is not null;
create unique index if not exists pd_expenses_one_correction_idx
  on public.pd_expenses(correction_of_expense_id) where correction_of_expense_id is not null;

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
    select * into original_payment from public.pd_payments
      where id=p_transaction_id and user_id=workspace_id for update;
    if not found then raise exception 'Payment was not found in this workspace'; end if;
    if original_payment.status <> 'posted' then raise exception 'Only posted payments can be corrected'; end if;
    if exists(select 1 from public.pd_payments where correction_of_payment_id=p_transaction_id) then
      raise exception 'This payment already has a correction';
    end if;

    update public.pd_payments set status='voided',void_reason='Corrected: ' || correction_reason
      where id=p_transaction_id;
    insert into public.pd_payments(
      user_id,account_id,amount,received_date,payment_method,income_category,
      principal_amount,interest_amount,fee_amount,unapplied_amount,memo,source_type,
      import_batch_id,correction_of_payment_id
    ) values (
      workspace_id,(p_correction->>'account_id')::uuid,(p_correction->>'amount')::numeric,
      (p_correction->>'received_date')::date,coalesce(nullif(p_correction->>'payment_method',''),'manual'),
      coalesce(nullif(p_correction->>'income_category',''),'installment'),
      coalesce(nullif(p_correction->>'principal_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'interest_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'fee_amount','')::numeric,0),
      coalesce(nullif(p_correction->>'unapplied_amount','')::numeric,0),
      nullif(p_correction->>'memo',''),'other',original_payment.import_batch_id,p_transaction_id
    ) returning id into replacement_id;
  elsif p_kind = 'expense' then
    select * into original_expense from public.pd_expenses
      where id=p_transaction_id and user_id=workspace_id for update;
    if not found then raise exception 'Expense was not found in this workspace'; end if;
    if original_expense.status <> 'posted' then raise exception 'Only posted expenses can be corrected'; end if;
    if exists(select 1 from public.pd_expenses where correction_of_expense_id=p_transaction_id) then
      raise exception 'This expense already has a correction';
    end if;

    update public.pd_expenses set status='voided',void_reason='Corrected: ' || correction_reason
      where id=p_transaction_id;
    insert into public.pd_expenses(
      user_id,property_id,account_id,amount,expense_date,category,payee,
      payment_method,memo,source_type,import_batch_id,correction_of_expense_id
    ) values (
      workspace_id,(p_correction->>'property_id')::uuid,nullif(p_correction->>'account_id','')::uuid,
      (p_correction->>'amount')::numeric,(p_correction->>'expense_date')::date,
      coalesce(nullif(p_correction->>'category',''),'other'),nullif(p_correction->>'payee',''),
      coalesce(nullif(p_correction->>'payment_method',''),'manual'),nullif(p_correction->>'memo',''),
      'other',original_expense.import_batch_id,p_transaction_id
    ) returning id into replacement_id;
  else
    raise exception 'Correction type must be payment or expense';
  end if;

  return replacement_id;
end;
$$;

revoke all on function public.pd_correct_transaction(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.pd_correct_transaction(text,uuid,jsonb,text) to authenticated;
