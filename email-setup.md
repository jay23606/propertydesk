# PropertyDesk email setup

## Providers and scope

- MailerSend is used for buyer/tenant month-end reminders because Resend rejected the free public dynv6 hostname.
- Supabase Auth confirmation and password reset email are separate and are not considered configured by this integration.
- The MailerSend API token is stored in Supabase as `MAILERSEND_API_TOKEN`. Never copy it into the repository, GitHub Pages assets, or client configuration.
- Sender address: `notifications@propertydesk.dynv6.net` (must be on a verified MailerSend domain).

## Domain state

The dynv6 records were added for SPF, two DKIM CNAMEs, and the MailerSend return path. The destinations use trailing periods so dynv6 treats them as absolute DNS names. Confirm verification in the MailerSend dashboard before enabling reminders; the Sending-access API token cannot read domain-verification status.

## Reminder behavior

- The `pd_accounts.monthly_reminder_enabled` switch defaults to false. No account is enrolled until the owner explicitly enables it.
- At the last calendar day in `America/New_York`, the scheduled `pd-month-end-reminders` function rechecks each active enabled account and its posted payment records.
- It skips accounts with any rent/installment/other payment recorded during that calendar month. Security deposits and late-fee-only entries do not count as a payment for this check.
- It also skips accounts with no valid recipient, no unpaid scheduled amount, or a paused/closed status.
- It calculates rolling Unpaid Due from the app's tracking start, Oct 1, 2026. The message includes the month, property address, and unpaid amount as of month end. It excludes the hypothetical loan balance.
- Multiple tenant/buyer addresses receive separate messages to avoid disclosing addresses to one another. The owner is not copied.
- Workspace shows accepted, failed, and skipped outcomes. “Accepted by MailerSend” means the provider accepted the API request; it does not confirm inbox delivery. Email bodies and API keys are never stored in the log.
- The account editor includes an admin preview marked “Nothing sent.” It does not send a test email.

## Production schedule prerequisites

The Supabase Edge Function requires these production secrets:

- `MAILERSEND_API_TOKEN` — already stored through the Supabase CLI.
- `MAILERSEND_FROM_EMAIL` — `notifications@propertydesk.dynv6.net`.
- `PD_REMINDER_CRON_SECRET` — a randomly generated value shared with Supabase Vault for the scheduled invocation.

Supabase Vault now stores the project URL, public publishable key, and matching reminder cron secret. The `propertydesk-month-end-reminders` `pg_cron` job runs daily at 03:30 UTC (about 10:30 or 11:30 p.m. in New York); the function exits without sending except on the last New York calendar day. The cron request is authenticated with the random header secret; never place that value in a tracked SQL file. The schedule definition is in `supabase/reminders-schedule.sql`.

## Future items

Late reminders, owner CC/reply-to options, provider delivery webhooks, and actual test sends are not included. Any test send should be an explicit owner action to a controlled address before enabling reminders for a tenant or buyer.

## References

- [MailerSend sending API](https://developers.mailersend.com/api/v1/email)
- [MailerSend domain API and verification](https://developers.mailersend.com/api/v1/email/domains)
- [Supabase scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
