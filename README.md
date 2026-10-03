# PropertyDesk starter

Static HTML, CSS, and JavaScript app designed for GitHub Pages, with Supabase Auth and a private Postgres schema.

The app is installable as a PWA when served over HTTPS. It caches only the static shell for faster launch; database records and authentication responses are never added to the service-worker cache. Payment and expense entry still requires a connection in this first version.

See `email-setup.md` for the Resend/Supabase Auth email plan and the current domain verification status.

Buyer/tenant reminders and statements are planned for a later stage. The design includes monthly and late reminder controls, admin previews/test sends, and optional per-account reply-to/copy settings; they are not enabled in this starter.

The future tenant/buyer portal is optional and separate from the owner workspace. Buyers and tenants will not need to sign up to receive owner-enabled email notices; all notices default to disabled. Portal logins, when offered, must be explicitly invited and restricted to the shared account.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `config.example.js` to `config.js`, then set your project URL and public anon key. This key is public project identification; Supabase RLS and grants protect records. Never use a service-role/secret key here.
4. Enable email/password auth and email confirmation in Supabase. Each owner gets a separate account and sees only their own records through database RLS. Before public onboarding, configure Auth rate limits and abuse protection; never rely on obscurity of the app URL as an access control.
5. Configure GitHub repository secrets `PROPERTYDESK_SUPABASE_URL` and `PROPERTYDESK_SUPABASE_ANON_KEY`, enable GitHub Pages with GitHub Actions as the source, and push to `main`. The workflow generates ignored `config.js` only in the deployment artifact. The public anon key is not a service credential; RLS and least-privilege grants are the access boundary.

All PropertyDesk tables use the `pd_` prefix (`pd_properties`, `pd_accounts`, `pd_payments`, `pd_expenses`, `pd_import_batches`, and `pd_audit_events`) so they can coexist with other apps in a shared Supabase project.

## Records and imports

- Create properties, then attach rental, land contract, or note accounts.
- Record income from the account or portfolio screen. Record repair and contractor costs in the Expenses screen.
- Import accounts from `templates/accounts-template.csv`; import expenses from `templates/expenses-template.csv`. Review data before importing. Screenshot reading happens outside this site; AI-prepared rows can be saved as CSV or entered through Supabase, where RLS and constraints still apply.
- Export a backup from Reports. Keep a separate copy of `config.js` and your exported records.

## Important product limits

PropertyDesk is a recordkeeping tool and does not collect payments. Loan allocation and amortization are estimates that must be checked against the signed contract. Do not use them as official payoff quotes without validating the agreement's interest convention and payment rules.

## Local checks

With Node.js installed, run `node --test tests/import-utils.test.cjs` from this directory to test CSV parsing, template compatibility, money validation, and date validation. These tests do not replace a live Supabase test of RLS, RPC rollback, or record isolation.
