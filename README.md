# PropertyDesk starter

Static HTML, CSS, and JavaScript app designed for GitHub Pages, with Supabase Auth and a private Postgres schema.

The browser code stays build-free. Reusable ledger, import, email, backup, and workspace-scoped data helpers live in separate files; portfolio, transaction, account and property detail, property activity, property-detail events, security-deposit detail, agreement and audit history, private document, export/backup, sign-in/recovery, workspace, property-management, ledger actions, modal lifecycle, theme/navigation, reminder preview, record-entry/CSV-import, and app-lifecycle workflows are grouped under `features/`. `app.js` creates the shared state and connects the features; `features/app-lifecycle.js` coordinates rendering, event binding, and startup.

The app is installable as a PWA when served over HTTPS. Dark mode is the default, with a light/dark toggle remembered on the device. It caches only the static shell for faster launch; database records and authentication responses are never added to the service-worker cache. Payment and expense entry still requires a connection in this first version.

See `email-setup.md` for the MailerSend reminder schedule and the current domain setup status.

Buyer/tenant month-end unpaid reminders are available per account and remain off by default. The account editor includes an email preview, and Workspace shows accepted, failed, and skipped attempts. The scheduled backend sends separate emails to each saved address only when no payment was recorded for the calendar month and unpaid scheduled charges remain. It does not copy the owner or include the hypothetical loan balance.

After sign-in, PropertyDesk opens directly to **Properties**, the primary day-to-day view.

The Properties grid can also open a manual reminder draft in the user's email app from the buyer/tenant name. It uses the reminder subject and message format; sending remains under the owner's control.

The future tenant/buyer portal is optional and separate from the owner workspace. Buyers and tenants will not need to sign up to receive owner-enabled email notices; all notices default to disabled. Portal logins, when offered, must be explicitly invited and restricted to the shared account.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `config.example.js` to `config.js`, then set your project URL and public anon key. This key is public project identification; Supabase RLS and grants protect records. Never use a service-role/secret key here.
4. Enable email/password auth and email confirmation in Supabase. Each owner gets a separate account; records remain workspace-private except for people explicitly added by the owner. Before public onboarding, configure Auth rate limits and abuse protection; never rely on obscurity of the app URL as an access control.
5. Configure GitHub repository secrets `PROPERTYDESK_SUPABASE_URL` and `PROPERTYDESK_SUPABASE_ANON_KEY`, enable GitHub Pages with GitHub Actions as the source, and push to `main`. The workflow generates ignored `config.js` only in the deployment artifact. The public anon key is not a service credential; RLS and least-privilege grants are the access boundary.

All PropertyDesk tables use the `pd_` prefix so they can coexist with other apps in a shared Supabase project. The schema also creates a private agreement-file bucket with owner-scoped upload and read policies.

## Records and imports

- Create properties, then attach rental, land contract, or note accounts.
- Use the Properties menu as the single portfolio view. Payment and Unpaid Due lead the row; on mobile those columns stay visible while the remaining property/account columns scroll horizontally. The property link shows the street only, without city/state/ZIP. The current month's installment is included even before its due day, and recorded payments reduce the rolling amount due. All unpaid-due tracking starts Oct 2026 because earlier payment history is incomplete; January–September installments are not assumed unpaid. Later missed installments carry forward. Inactive accounts and archived properties are hidden by default; use Show inactive / archived to reveal them. Record repair and contractor costs in the Transactions screen.
- Use Workspace to set a display name and add/remove a trusted person by their verified account email. Members can manage the whole workspace. Property holder tags help filter the Properties grid and do not restrict access. Adding a member currently requires that person to sign up first; this release does not send invitation emails.
- Upload PDF, DOCX, or JPEG agreements from a property's detail view. Click a filename to open it through a short-lived private link; the browser handles viewing and downloading (PDFs can be saved from the browser viewer). ZIP backups contain the records and private agreement files.
- Correct a transaction from the ledger to atomically void the original and create a linked replacement with a reason; both entries remain in history, and only the replacement affects current balances and reports. A separate Void action remains available when no replacement is needed.
- Rental security-deposit receipts, refunds, retention, and retention reversals have a separate held-balance ledger. Choose **Security deposit refund** as an expense category and link it to the rental account; it does not count as rent or an operating expense.
- Import accounts from `templates/accounts-template.csv`; import expenses from `templates/expenses-template.csv`. Review data before importing. Screenshot reading happens outside this site; AI-prepared rows can be saved as CSV or entered through Supabase, where RLS and constraints still apply.
- Contract imports preserve original agreement terms. Estimated loan balances follow each agreement's amortization schedule as if installments were paid on time, with any owner-entered adjustment applied. Regular payment entry records the amount received and date without requiring a principal, interest, or escrow split. Receipts affect Unpaid Due and payment history, not the hypothetical on-time loan balance. Buyer/tenant email is private account contact data only; reminders remain disabled unless separately enabled.
- The Properties grid footer totals visible unpaid due, cadence-normalized monthly scheduled payments, and estimated loan balances. Totals recalculate with search and filters; properties without accounts are excluded.
- Payment and expense imports flag matching rows in the full preview and skip them by default on re-import. A possible duplicate can be included explicitly if it represents a separate real transaction.
- Successful CSV imports are committed with a private batch receipt that records the source filename, time, status, and row counts. Imported rows link to that receipt; failed imports roll back instead of leaving a partial batch.
- Review import receipts in Reports and export them with properties, accounts, income, expenses, and void details in the backup. ZIP backups include workspace-member links, property-holder labels, and the actual private agreement files. Backups are not restorable by the app yet; keep a separate copy of `config.js`.

## Important product limits

PropertyDesk is a recordkeeping tool and does not collect payments. Loan allocation and amortization are estimates that must be checked against the signed contract. Do not use them as official payoff quotes without validating the agreement's interest convention and payment rules.

## Local checks

With Node.js installed, run `npm test` from this directory. Tests cover CSV imports, money and date validation, ledger calculations, feature wiring, and reminder behavior. The rollback-only live Supabase checks use synthetic users and records:

- `supabase db query --linked --file supabase/tests/workspace_security.sql` checks workspace row-level security.
- `supabase db query --linked --file supabase/tests/payment_allocation_integrity.sql` checks legacy allocation constraints.
- `supabase db query --linked --file supabase/tests/transaction_correction_integrity.sql` checks atomic corrections and audit history.
- `supabase db query --linked --file supabase/tests/deposit_ledger_integrity.sql` checks held-deposit calculations and refund safeguards.
- `supabase db query --linked --file supabase/tests/import_integrity.sql` checks atomic imports, source receipts, and workspace account isolation.

These live database checks do not replace periodic independent security review.

## Post-deploy smoke check

When a file listed in `sw.js` under `SHELL_FILES` changes, increment `CACHE_NAME` so installed PWAs replace their cached shell. GitHub Actions runs the unit suite and a Chromium smoke test on the candidate before publishing, then opens the deployed app in Chromium with a signed-in synthetic workspace and checks note amortization, rental deposit details, and account history without page, console, or service-worker errors. Keep a deploy unverified until both jobs pass. For a broader manual check, reload the live app, verify the Properties totals respond to search/filter changes, open a property and account, and confirm Record payment starts with the scheduled monthly payment.
