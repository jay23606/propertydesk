# PropertyDesk

PropertyDesk helps property owners manage rentals and seller-financed accounts, including land contracts and private notes, in one workspace. Use it to keep property and tenant/buyer records, log payments received, track unpaid monthly amounts, record expenses, and store agreement files. It records payments; it does not process them.

**Try the live app:** [Open PropertyDesk](https://jay23606.github.io/propertydesk/)

Built with HTML, CSS, and JavaScript for GitHub Pages, with Supabase Auth and a private Postgres schema.

The source code is licensed under the [MIT License](LICENSE).

## Browser architecture

The browser app uses plain HTML, CSS, and JavaScript with no build step. `app.js` is the composition root: it builds feature dependencies before the workflows that consume them, passes callbacks directly, and hands rendering, event binding, and startup to `features/app-lifecycle.js`.

Shared initialization lives in `features/app-services.js`. It creates the Supabase client, workspace loader, notifications, and ledger helpers. General formatting and input helpers live in `features/app-utils.js`; property location and street-address formatting live in `features/property-address-utils.js`. `property-document-workflow.js` composes private agreement actions and their event router; `documents.js` composes `document-upload.js` for private file upload and `document-actions.js` for opening and deleting agreements. `document-repository.js` resolves the active authenticated client for storage and workspace-scoped metadata. Account-party email normalization and reminder prerequisites live in `features/account-form-model.js`, while `features/account-payload.js` maps validated values to saved records; manual payment and expense records are mapped in `features/transaction-payloads.js`. Posted transaction totals and deposit balances live in `ledger-utils.js`; rolling due accrual lives in `ledger-schedule-utils.js`, while hypothetical amortization and principal balance calculations live in `loan-amortization-utils.js`. Both are composed through the stable ledger API. Feature modules keep screens, forms, calculations, writes, and delegated actions focused by area:

- Overview, Properties, and property activity: `property-workspace-workflow.js` connects property details, the overview, and portfolio actions. `overview-model.js` builds workspace summaries, while `overview-property-summary-model.js` derives each card's financial summary and `overview.js` renders them. `property-portfolio-model.js` filters and sorts the grid while `property-portfolio-account-row-model.js` derives account balances and reminder fields; `property-activity-model.js` keeps activity calculations separate from rendering. The portfolio workflow owns grid actions, including quick-note editing. `property-details.js` handles modal state, `property-details-view.js` renders property accounts and summary details, and `property-documents-view.js` renders attached agreements; `property-detail-actions-workflow.js` composes account, holder, archive, and property quick actions, with holder-label routing in `property-holder-events.js` and private-document actions in their own router and workflow.
- Property, account, receipt, and expense entry: `record-entry-workflow.js` composes the independent property and account forms, ledger-entry forms, and create actions; `app.js` connects its actions and event binders with the rest of the app. Property value reading, reset, and submit binding live in `property-form-view.js`; payment and expense views own field reading, reset, and launch presentation in `payment-entry-view.js` and `expense-entry-view.js`, separate from receipt and expense persistence. Account field population, reset behavior, value reading, and bindings live in `account-form-view.js`, separate from account validation and persistence.
- Shared UI helpers: `modal-controller.js` manages modal open/close lifecycle and workflow-state cleanup; `form-options.js` builds the shared property, payment, and expense select options.
- Account and deposit maintenance: `account-details-workflow.js` connects account details, history, and account closure; `deposit-workflow.js` composes the held-deposit ledger, its view, adjustments, and events. `account-maintenance.js` and `deposit-maintenance.js` keep their writes independently focused. `deposit-details-model.js` prepares held-balance rows for `deposit-details-view.js`.
- Account details: `account-details.js` prepares the selected account and estimates; `account-details-view.js` renders them. `account-history-model.js` loads and maps prior terms and audit events for `account-history-view.js`.
- Transaction history and maintenance: `transaction-list-model.js` filters and associates rows, `transaction-row-view.js` renders them, and `transaction-views.js` updates the ledger screen. `transaction-workflow.js` connects that screen with audited corrections, voids, and delegated action routing, while `transaction-maintenance-workflow.js` keeps those maintenance actions grouped separately. Correction-target validation and audit reasons live in `transaction-correction-form.js`; `transaction-correction-view.js` fills the entry forms.
- Reports, imports, and exports: `report-model.js` separates report totals from `report-views.js`; `csv-import-workflow.js` coordinates review, `csv-import-file.js` owns file parsing/status/reset behavior, `account-import-payload.js` maps validated account rows, and `import-commit.js` centralizes persistence, refresh, and result reporting for account, payment, and expense batches. `report-workflow.js` connects reports and account CSV export. `backup-records.js` pages through workspace tables, while `backup-export.js` coordinates ZIP creation and download; `backup-agreement-files.js` validates and collects private files, and `backup-utils.js` maintains the versioned backup manifest.
- Workspace shell: `app-shell-workflow.js` connects workspace settings, navigation, and theme controls; the workspace view includes reminder activity, while `reminder-workflow.js` owns delivery history and email preview. Workspace member roster display and events live in `workspace-members-view.js`, separate from membership RPC workflows. Authentication screens, sign-in form presentation and workflow (`auth-form-view.js` and `auth-form.js`), recovery workflow and presentation (`auth-recovery.js` and `auth-recovery-view.js`), and sessions remain in focused modules.

The module scripts are loaded by `index.html` and listed in the service worker shell. Keep the shell list in sync when adding or removing a browser module; increment the shell cache version when a cached file changes.

The app is installable as a PWA when served over HTTPS. Dark mode is the default, with a light/dark toggle remembered on the device. It caches only the static shell for faster launch; database records and authentication responses are never added to the service-worker cache. Payment and expense entry still requires a connection in this first version.

See `email-setup.md` for the MailerSend reminder schedule and the current domain setup status.

Buyer/tenant month-end unpaid reminders are available per account and remain off by default. The account editor includes an email preview, and Workspace shows accepted, failed, and skipped attempts. The scheduled backend sends separate emails to each saved address only when no payment was recorded for the calendar month and unpaid scheduled charges remain. It does not copy the owner or include the hypothetical loan balance.

After sign-in, PropertyDesk opens directly to **Properties**, the primary day-to-day view.

The Properties grid can also open a manual reminder draft in the user's email app from the buyer/tenant name. It uses the reminder subject and message format; sending remains under the owner's control.

The future tenant/buyer portal is optional and separate from the owner workspace. Buyers and tenants will not need to sign up to receive owner-enabled email notices; all notices default to disabled. Portal logins, when offered, must be explicitly invited and restricted to the shared account.

## Connect Supabase

1. Create a Supabase project.
2. For a new project, run `supabase/schema.sql` as the complete current schema snapshot. For a project managed with the Supabase CLI, link it and apply the ordered files in `supabase/migrations/` with `supabase db push`; do not apply the snapshot and then replay those same migrations.
3. Copy `config.example.js` to `config.js`, then set your project URL and public anon key. This key is public project identification; Supabase RLS and grants protect records. Never use a service-role/secret key here.
4. Enable email/password auth and email confirmation in Supabase. Each owner gets a separate account; records remain workspace-private except for people explicitly added by the owner. Before public onboarding, configure Auth rate limits and abuse protection; never rely on obscurity of the app URL as an access control.
5. Configure GitHub repository secrets `PROPERTYDESK_SUPABASE_URL` and `PROPERTYDESK_SUPABASE_ANON_KEY`, enable GitHub Pages with GitHub Actions as the source, and push to `main`. The workflow generates ignored `config.js` only in the deployment artifact. The public anon key is not a service credential; RLS and least-privilege grants are the access boundary.

All PropertyDesk tables use the `pd_` prefix so they can coexist with other apps in a shared Supabase project. The schema also creates a private agreement-file bucket with workspace-scoped upload and read policies.

## Privacy and current security limits

Supabase Auth, least-privilege grants, and row-level security separate unrelated workspaces. The rollback-only `supabase/tests/workspace_security.sql` checks that members can work in their shared workspace while an unrelated signed-in user cannot read or write it. Workspace members intentionally share access to all properties and records; property-holder labels do not restrict access.

Supabase-managed encryption at rest and HTTPS protect infrastructure and network traffic, but the app does not currently encrypt customer records or agreement files before storing them. Authorized database and storage access, including the project operator and the reminder function's service role, can read that data. Supabase documents that secret/service-role credentials bypass RLS, so they must remain in trusted server-side code. Month-end reminders are optional and off by default; when enabled, the reminder function reads the contact and account data and MailerSend receives the recipient address and message. The activity log stores a recipient number rather than duplicating the email address; the saved account contact itself remains readable to authorized workspace members and privileged backend access.

Audit history now keeps action metadata instead of copying full row contents into JSON snapshots; the linked database migration removed those redundant snapshots. This reduces duplication but does not make PropertyDesk end-to-end encrypted or operator-blind. The encryption, deployment-integrity, and independent-review gates are tracked in [design.md](design.md); do not make stronger privacy claims until they are met.

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

With Node.js installed, run `npm run format:check`, `npm run lint`, and `npm test` from this directory. Formatting checks cover the HTML shell, stylesheets, and browser smoke scripts; lint catches undefined and unused names in browser code; tests cover CSV imports, money and date validation, ledger calculations, feature wiring, and reminder behavior. The rollback-only live Supabase checks use synthetic users and records:

- `supabase db query --linked --file supabase/tests/workspace_security.sql` checks workspace row-level security.
- `supabase db query --linked --file supabase/tests/payment_allocation_integrity.sql` checks legacy allocation constraints.
- `supabase db query --linked --file supabase/tests/transaction_correction_integrity.sql` checks atomic corrections and audit history.
- `supabase db query --linked --file supabase/tests/deposit_ledger_integrity.sql` checks held-deposit calculations and refund safeguards.
- `supabase db query --linked --file supabase/tests/import_integrity.sql` checks atomic imports, source receipts, and workspace account isolation.

These live database checks do not replace periodic independent security review.

## Post-deploy smoke check

When a file listed in `sw.js` under `SHELL_FILES` changes, increment `CACHE_NAME` so installed PWAs replace their cached shell. GitHub Actions runs lint, the unit suite, and a Chromium smoke test on the candidate before publishing, then opens the deployed app in Chromium with a signed-in synthetic workspace and checks the core property, account, payment, deposit, transaction, report, and workspace workflows for page errors, console errors, service-worker errors, and unhandled promise rejections. Run that same live check manually with `npm run smoke:deployed -- https://jay23606.github.io/propertydesk/`; keep a deploy unverified until it passes. For a broader manual check, reload the live app, verify the Properties totals respond to search/filter changes, open a property and account, and confirm Record payment starts with the scheduled monthly payment.
