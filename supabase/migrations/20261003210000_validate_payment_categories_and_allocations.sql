-- Apply account-type-aware payment categories and allocation invariants.
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
    if new.principal_amount <> 0 or new.interest_amount <> 0 or new.fee_amount <> 0 or new.unapplied_amount <> 0 then
      raise exception 'Rental receipts cannot carry loan allocations';
    end if;
    if new.income_category not in ('rent','late_fee','deposit','other') then
      raise exception 'Rental receipts must use a rental income category';
    end if;
  else
    if new.income_category not in ('installment','late_fee','other') then
      raise exception 'Financing receipts must use a financing income category';
    end if;
    if round(new.amount::numeric,2) <> round(new.principal_amount + new.interest_amount + new.fee_amount + new.unapplied_amount,2) then
      raise exception 'Loan payment allocations must sum to the amount received';
    end if;
  end if;
  return new;
end;
$$;
