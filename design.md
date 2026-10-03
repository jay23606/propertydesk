# PropertyDesk product design

## Product direction

PropertyDesk is a private, lightweight property operations desk for an owner with rentals, seller-financed land contracts, and private notes. It brings together the property-first workflows people recognize from rental management tools such as Buildium and Apartments.com, with the account ledgers, schedules, balances, and borrower histories found in loan-servicing software.

The product should feel calm and minimal. It should make routine bookkeeping faster, while keeping every recorded amount traceable to a date, property, account, and source. It is initially a recordkeeping and portfolio-management tool; payment processing is outside the initial scope.

## Product principles

1. **Property first.** Start from a property, then see its rental or financing accounts, income, costs, documents, and balance history.
2. **Record a transaction quickly.** A frequent task should take only a few clear fields: property/account, amount, date, category, and optional memo.
3. **Keep the ledger explainable.** Store original transactions and explicit allocations. Derive totals from them; do not silently rewrite history when terms change.
4. **Private by default.** Each person sees only records owned by their authenticated Supabase user. Enforce this in database policies, not just in the interface.
5. **Make imports reviewable.** Support manual app entry and CSV imports. Show mapped fields and validation errors before writing imported records.
6. **Stay focused.** Avoid heavyweight enterprise dashboards, payment collection, maintenance dispatch, tenant screening, and legal automation until users ask for them.

## People and use cases

PropertyDesk has two distinct experiences: an owner/manager workspace and an optional tenant/buyer portal. The initial owner is a small property owner who may keep rentals, land contracts, and private notes in one portfolio. Owners may have existing records in Buildium-like software, spreadsheets, statements, or screenshots. Tenants and buyers never need to create an account to receive enabled email notices or to keep paying outside the app.

Primary jobs:

- Add a property and attach one or more accounts to it.
- Quickly record rent, an installment payment, a partial payment, or another receipt.
- Record an expense for repairs, contractors, taxes, insurance, or other property costs.
- See collected income, expenses, net cash flow, remaining loan principal, and upcoming due dates by property and across the portfolio.
- Import historical data before regular use, or keep making entries in the app while optionally backfilling data later.
- Export records for backup, taxes, or review in a spreadsheet.
- Optionally invite a buyer/tenant to a separate, narrowly scoped portal for their own account.
- Enable email notices independently of portal access; notices are off by default.

Tenant/buyer jobs, only if invited and they choose to sign in:

- See only the account(s) the owner explicitly shared with them, including selected due dates, payment history, and balance details.
- Update their contact email or notification preference, if the owner enables those controls.
- Contact the owner using the configured reply-to address. The portal does not collect or process payments in the initial release.

## Navigation and information architecture

Keep the primary navigation small:

- **Overview:** portfolio totals, upcoming items, recent activity, and properties.
- **Properties:** property list and a property detail view.
- **Accounts:** rentals, land contracts, and private notes.
- **Separate contract terms from ledger balance:** preserve the signed original principal and payment terms while allowing an owner-set opening balance and its as-of date. Agreement-only imports may initialize the ledger balance at $0 until historical payments establish a trustworthy starting point.
- Store a tenant/buyer email only when provided by the owner or clearly identified in the agreement; reminder messages remain disabled until explicitly enabled and configured.
- **Transactions:** income and expenses in a unified, filterable ledger.
- **Reports:** income, expenses, net cash flow, balances, and export/import.

Property detail is the organizing screen. It should show a compact property summary, related accounts, recent income and expenses, attachments or source references, and property-level totals. Account detail holds the agreement terms, payment history, current balance, and (for loans) an estimated amortization schedule.

The owner workspace and tenant/buyer portal must have distinct navigation and authorization. Portal users do not see owner dashboards, property expenses, other accounts, portfolio reports, imports, or administrative settings. Sharing is account-specific and explicit; account access is not inherited merely because two accounts use the same email address or property.

## Key workflows

### Fast income entry

Provide a persistent **Record income** action. When opened from a property, preselect that property and let the user choose an account if there is more than one. Required fields are property/account, amount, and received date. Default the date to today. Payment method and memo are optional. For a rental, categorize the receipt as rent, late fee, deposit, or other income. For a note or land contract, preview the suggested interest/principal/fee/unapplied allocation and allow editing before saving.

Support entering several receipts in sequence without returning to the portfolio overview. Make the next due date and last payment visible on each account so monthly bookkeeping can be done with a short scan.

### Expense entry

Provide a persistent **Record expense** action, available from the portfolio and property detail. Required fields are property, amount, date, and category. Optional fields include related account, payee/contractor, payment method, memo, and receipt attachment. Seed categories with repairs, contractor labor, materials, taxes, insurance, utilities, management, and other. Allow notes and category edits without losing the original transaction record.

For this initial bookkeeping workflow, expenses reduce property cash flow but do not change loan principal or rental account balances. Track reimbursements or refunds as separate linked transactions when supported.

### Land contract and note payment allocation

Store the received payment as an immutable transaction and store its allocation as separate rows or explicit allocation fields. Support principal, interest, fees, and unapplied funds. The app can suggest an allocation from the account terms and prior ledger, but it must label the calculation as an estimate and allow manual correction. Keep a dated audit trail for edits and reversals. Since posted ledger rows are append-only, provide an owner-only **Void** action for mistakes: it changes only the transaction status, preserves the original row and reason/timestamp, and records before/after values in the audit log. A voided entry must not affect balances or reports and must never be restorable to posted status; enter a corrected transaction as a new row.

Display original principal, principal paid, current principal, scheduled payment, next due date, interest rate, term, and balloon date when provided. Amortization previews are informational until validated against the signed agreement and jurisdiction-specific terms.

### Import and AI-assisted backfill

Any user may ask ChatGPT to convert their records or screenshots into a PropertyDesk CSV, then import that file through their authenticated PropertyDesk session. PropertyDesk itself does not send customer data to an AI service or read, upload, or parse screenshots. The app validates and previews the CSV locally before saving it to that user's Supabase workspace. App entry and CSV imports converge on the same validated transaction format. Direct database backfills remain an owner/admin workflow and must still pass RLS and database constraints.

Import flow:

1. Parse a CSV into a staging preview before saving it.
2. Match property and account names, dates, amounts, categories, and parties. Flag uncertain or missing values.
3. Detect possible duplicate transactions using property/account, date, amount, and memo/source note. Label each suspected row in the preview and exclude it from the default import selection so re-uploading a file does not silently create duplicates. Let the owner explicitly include a suspected duplicate when the match is intentional.
4. Let the owner review and correct the rows, then explicitly commit them.
5. Preserve source metadata (filename or owner-entered source note, import batch, and import timestamp) so entries can be traced.
6. Produce a row-level success/error report and permit safe re-import without duplication.

ChatGPT-assisted transcription happens in the user's own ChatGPT workflow and is a convenience, not an authoritative source. The user reviews ambiguous values before importing. PropertyDesk must never ask users to paste Supabase credentials, API keys, or service-role secrets into ChatGPT. If a user sometimes uses the app while also backfilling, duplicate detection and transaction provenance are essential.

## Minimal visual design

Use a light warm-gray canvas, white surfaces, subtle borders, dark green primary actions, restrained muted colors, and clear typography. Prefer compact tables and plain language over charts and decorative illustrations. Show portfolio totals as a few high-value cards, then put the actual transactions and property records close at hand.

Forms should default dates and known property/account values, accept decimal amounts, work well on mobile, and make save confirmation obvious. Use a single unified ledger with clear income/expense labels and filters rather than separate complex accounting modules.

## Data model

Core tables in the current Supabase schema use the `pd_` project prefix:

- `pd_properties`: owner, name, address, type, notes.
- `pd_accounts`: owner, property, account type (`rental`, `land_contract`, `note`), party, contract terms, scheduled amount/frequency, optional P&I-only installment amount when the scheduled total includes escrow, status.
- `pd_payments`: owner, account, gross amount, received date, method, memo, source/import batch, explicit principal/interest/fee/unapplied allocation columns, and posted/voided state.
- `pd_expenses`: owner, property, optional account, amount, expense date, category, payee, method, memo, optional receipt path, source/import batch, and posted/voided state.
- `pd_import_batches`: owner, filename or description, created/committed timestamps, row counts and status. Avoid retaining raw uploaded financial documents by default; keep only what is needed to audit the imported rows.
- `pd_audit_events`: owner, entity, action, timestamp, prior/new values or a safe change summary.
- Future portal support: a `pd_account_portal_access` table linking one authenticated portal user to an explicitly shared account, plus separate invitation/verification state. Do not grant portal users access to owner-scoped tables directly; expose a narrow, tested view or server-side API that returns only the approved account ledger fields.
- Future email support: per-account notice preferences and recipient address (default disabled), optional reply-to/CC settings, and a delivery-attempt log with minimal metadata; name these `pd_` tables too.

Use decimal/numeric storage for money. Use ISO calendar dates for transaction dates and UTC timestamps for audit metadata. Add checks for positive amounts, allowed categories/types, and correct ownership relationships. Enable row-level security on every owner-scoped table. Authenticated reads and writes must be scoped to `auth.uid()`; child records must also reference a parent owned by that user. Never put a Supabase service-role key or private secret in the static GitHub Pages app.

## Portfolio calculations

- **Income collected:** sum of posted receipt transactions in the selected period.
- **Expenses:** sum of posted expense transactions in the selected period.
- **Net cash flow:** income minus expenses; keep loan principal and interest separately reportable.
- **Loan principal balance:** original principal minus posted principal allocations, adjusted only by explicit principal adjustments or reversals.
- **Rental balance:** show open charges/receipts if a charge ledger is introduced; do not present a bank-style loan balance for a rental.
- **Scheduled monthly amount:** normalize frequency only for portfolio summaries and label it as an estimate when payment cadence is not monthly.

Calculations must be reproducible from ledger rows and must be covered by examples with partial payments, overpayments, refunds/reversals, and backdated entries before broader use.

## Privacy and security

Each owner account is a private workspace. Enforce row-level security for properties, accounts, payments, expenses, import batches, attachments metadata, and audit events. Store uploads in a private Supabase Storage bucket with per-user path policies and short-lived signed links. Validate ownership again in database policies for every child insert. Use the public anon key only in the static client; keep service-role access in trusted server-side jobs only.

Portal authentication is optional and separate from owner access. An invitation can only grant access to a specific account after the owner explicitly shares it and the invitee verifies control of their email. A portal identity must never inherit the owner's user id or receive access through a broad owner policy. Use a separate portal authorization model and narrow server-side interface; test that a portal user cannot enumerate properties, read expenses, or access another account by changing an id. Email delivery remains independent of portal identity: notices can go to a verified contact without an app login, and all buyer/tenant notices stay disabled until enabled by the owner.

Do not expose records in public pages, search indexes, logs, client error reports, or shared links. Use HTTPS in transit and Supabase-managed encryption at rest; enforce row-level security and private storage. Client-side CSV parsing and preview should avoid unnecessary copies and clear parsed data from memory after import. Provide account deletion/export controls and recommend a separate backup. Do not store bank credentials or payment card details. If payment processing is added later, use a provider-hosted/tokenized flow and assess servicing, consumer protection, money-transmission, tax, and privacy requirements first.

Supabase-managed encryption at rest and TLS are the first-release baseline, but they do not mean that data is end-to-end encrypted from the service operator. True client-side encryption would require each user to keep a separate recovery key and would limit server-side search, reporting, and account recovery. Do not claim end-to-end encryption unless that design is implemented and independently reviewed.

For this product, prioritize correct RLS, least-privilege database grants, secure account recovery, and private backups before considering field-level encryption.

The owner sign-in screen must provide password recovery through Supabase Auth. Recovery links must return to the deployed app, accept a new password only with the verified recovery session, and show generic request feedback so the page does not reveal whether an email address has an account.

## Progressive web app

Ship PropertyDesk as an installable PWA for phone and desktop use. The service worker may cache the static app shell only. Do not cache authenticated API responses, tokens, property/account data, or uploaded documents in Cache Storage. The first release supports on-the-go use when connected; it does not queue financial writes offline. Offline transaction queues would need unique idempotency keys, visible sync status, conflict handling, and device logout/lock behavior before being enabled.

## Transactional email

Use Resend through Supabase Auth's custom SMTP configuration for confirmation and password recovery emails after `propertydesk.dynv6.net` is verified. Keep Resend credentials in Supabase settings/secrets. For buyer/tenant notices, use trusted server-side code (such as a Supabase Edge Function), never the static browser app.

### Buyer and tenant notices

Email notices do not require a buyer/tenant portal account. Keep every notice type disabled by default per account/contact. Let the owner enable email per account/contact, with separately configurable monthly payment reminder and late reminder. Enable only after the owner adds and verifies the recipient address, selects notice types, and confirms the applicable consent/notice basis. Provide a clear pause/disable control. Late reminders use a configurable grace period and are sent at most once per due cycle; do not send if a payment has been recorded or the account is paused/closed. Recheck due status immediately before sending to avoid stale reminders.

For each type, provide an owner/admin preview that uses the selected account's current data and clearly marks itself as a preview; allow sending a test message to the owner's own address. Show the exact recipient, copy recipient, reply-to address, subject, and rendered body before enabling the schedule. Include the as-of date and an explanation of how the figure was calculated. For land contracts/notes, label principal as an estimated ledger balance, never an official payoff quote. For rentals, report rent due/received only when the app has enough charge/ledger data to support it; do not invent a balance from payment history alone.

Include only the minimum information needed: buyer/tenant name, property label, due date, scheduled amount, recorded payments for the period, and current amount due or estimated principal balance as appropriate. Never include full account numbers, credentials, or unnecessary contract details. Emails can be forwarded or misdelivered, so the owner must be able to choose the recipient and review message content. Log delivery attempts, template/version, recipient, schedule cycle, and outcome without logging message bodies or secrets. Make the log visible to the owning user only, and ensure a reminder job scopes and rechecks every row by that authenticated owner's id.

Offer an optional copy-to email address per account. When set, use it as the message's `Reply-To` so replies route to the owner/manager's supplied inbox. Also offer an explicit CC toggle if the owner wants that address to receive a copy; explain that CC exposes recipient addresses to the buyer/tenant. Default CC off, since `Reply-To` alone handles replies without disclosing the owner's address as a copied recipient. Validate the copy address and send a test email before activating it. This address is account contact data, private under the same RLS boundary, and is never displayed to another owner.

Domain setup status and exact DNS records are tracked in `email-setup.md`; never guess DNS values. Reminder scheduling, delivery logs, recipient controls, and previews are a later stage than Auth email and need dedicated schema/RLS policies plus end-to-end tests before activation.

## Delivery stages

1. **Private portfolio foundation:** authentication, RLS, properties, accounts, per-user workspace, export.
2. **Daily ledger:** quick income entry, expense entry, property detail, searchable transaction ledger, simple cash-flow summaries.
3. **Loan tracking:** amortization preview, editable payment allocations, due tracking, statements, audit history.
4. **Historical imports:** CSV template and staging preview, duplicate checks, and import receipts. Users may prepare files with their own AI assistant; PropertyDesk does not need an AI API integration for the initial flow.
5. **Optional integrations:** receipt storage, accounting exports, borrower portal, and only later payment collection if validated.

## Product boundaries and open decisions

- Initial release records payments; it does not initiate or collect them.
- Choose whether expenses can be linked to an account as well as a property; default to property-level expense with an optional account link.
- Define whether rental charges are needed in the first release or whether the first version tracks cash received and costs only.
- Confirm the intended loan interest method and date rules against actual contracts before relying on payoff calculations.
- Confirm the user's jurisdiction and data-retention needs before adding legal notices, contract generation, payment collection, or compliance claims.

## Success measures

- A typical income or expense transaction can be recorded in under 20 seconds.
- An owner can find a property’s collected income, costs, and loan balance without exporting to a spreadsheet.
- An import preview makes ambiguous and duplicate rows visible before commit, without sending the data to an AI provider.
- A user can export their complete records and can verify that a second user cannot read or change them.
- The owner can reconcile an account balance to its source payment and allocation history.
