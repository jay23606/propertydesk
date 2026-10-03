-- Hide vacant or retired property records from the active portfolio without deleting history.
alter table public.pd_properties add column if not exists archived_at date;
