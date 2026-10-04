-- The cron secret, project URL, and publishable key are stored in Supabase Vault.
-- Re-running cron.schedule with this job name updates the existing job.
select cron.schedule(
  'propertydesk-month-end-reminders',
  '30 3 * * *', -- 23:30 EDT / 22:30 EST; the function sends only on the New York month's last day.
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'pd_reminder_project_url') || '/functions/v1/pd-month-end-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'pd_reminder_apikey'),
        'x-propertydesk-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pd_reminder_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) as request_id;
  $job$
);
