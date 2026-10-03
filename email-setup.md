# PropertyDesk email setup

## Proposed use

Use Resend for PropertyDesk transactional email:

- Supabase Auth confirmation and password reset email, through Resend SMTP.
- Later: owner-configured buyer/tenant monthly and late reminders through a Supabase Edge Function, with preview/test-send and per-account recipient controls.

Do not call Resend from the static browser app. Keep all Resend API/SMTP secrets inside Supabase project secrets or Supabase Auth SMTP settings. Email content should be minimal: avoid including balances, full property addresses, contract terms, or payment details; direct the user to sign in to view them.

## Domain state from the supplied setup note

- Sending domain to try: `propertydesk.dynv6.net`.
- The dynv6 zone exists, but its IP address is not configured. No web-host IP is needed just to add email DNS records.
- Resend acceptance and verification are not confirmed.
- DNS record values are not available yet. Do not invent them.
- Candidate sender after verification: `PropertyDesk <notifications@propertydesk.dynv6.net>`.

## Setup sequence

1. In Resend, add `propertydesk.dynv6.net` as a sending domain and choose the sending region.
2. Copy the exact DNS record type, host/name, value, and priority shown by Resend into the existing dynv6 zone. Follow Resend's current instructions for host formatting; do not guess whether a name is relative or fully qualified.
3. Wait for Resend to verify the domain and sending capability.
4. Create a dedicated Resend API key for PropertyDesk/Auth mail.
5. In the Supabase project, configure custom Auth SMTP using Resend's current SMTP settings. Resend currently documents `smtp.resend.com`, username `resend`, API key as the password, and port `465` for SMTPS. Keep those credentials in Supabase, never in `config.js` or GitHub Pages.
6. Set the sender address/name to the verified domain and configure Supabase Auth's Site URL and allowed redirect URLs to the deployed PropertyDesk HTTPS URL.
7. Customize and test signup confirmation and password reset templates with a test account. Confirm links return to the correct app URL.
8. Keep signup confirmation enabled and set a suitable Auth email rate limit before public onboarding.

If Resend rejects the dynv6 hostname or DNS configuration, record its exact error and choose a domain the owner controls that Resend accepts. Do not claim mail is configured until Resend reports the domain verified and an end-to-end test email is received.

## Later buyer/tenant notices

Scheduled notices must be triggered from trusted server-side code such as a Supabase Edge Function; store the Resend key in Supabase secrets. The owner should be able to enable monthly reminders and late reminders separately for each buyer/tenant account, preview the exact rendered message, and send a test message before enabling. Include current amount due and recorded payments where the ledger supports it. For notes/land contracts, identify principal as an estimated ledger balance with an as-of date, not an official payoff quote. For rentals, only state an amount due when charges are recorded well enough to calculate it.

Buyer/tenant portal registration is never a prerequisite for email delivery. Every contact's notices start disabled; the owner must enable the selected notice types. The recipient can receive email without a PropertyDesk login.

Allow an optional per-account copy-to address configured by the owner. Set it as `Reply-To` so replies reach the supplied inbox; make CC a separate opt-in toggle because CC reveals that address to the recipient. Do not send from the browser. Recheck due status and recent payments immediately before a late notice, limit to one late notice per due cycle, and skip paused/closed accounts. Log recipient, cycle, template version, timestamp, and delivery result without retaining rendered email bodies. Apply per-user RLS to recipient settings and logs, and add a manual pause/disable control. These features need schema, RLS, schedule, and delivery tests before use with real contacts.

## References

- [Supabase custom SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend SMTP settings](https://resend.com/changelog/smtp-service)
- [Supabase Auth emails with Resend and an Edge Function](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend)
