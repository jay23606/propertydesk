create or replace function public.propertydesk_audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_user_id uuid;
  row_id uuid;
  event_action text;
begin
  if tg_op = 'DELETE' then
    row_user_id := old.user_id;
    row_id := old.id;
    event_action := 'deleted';
    insert into public.pd_audit_events(user_id, entity_type, entity_id, action, summary)
      values (row_user_id, tg_table_name, row_id, event_action, 'Deleted row from ' || tg_table_name);
    return old;
  end if;

  row_user_id := new.user_id;
  row_id := new.id;
  if tg_op = 'INSERT' then
    event_action := 'created';
  elsif tg_table_name in ('pd_payments','pd_expenses') then
    if old.status = 'posted' and new.status = 'voided' then
      event_action := 'voided';
    else
      event_action := 'updated';
    end if;
  else
    event_action := 'updated';
  end if;

  insert into public.pd_audit_events(user_id, entity_type, entity_id, action, summary)
    values (row_user_id, tg_table_name, row_id, event_action,
      case when event_action = 'voided' then 'Voided transaction in ' || tg_table_name else 'Recorded ' || lower(tg_op) || ' in ' || tg_table_name end);
  return new;
end;
$$;
