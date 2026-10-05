# PropertyDesk product design

## Product direction

PropertyDesk is a private, lightweight property operations desk for an owner with rentals, seller-financed land contracts, and private notes. It brings together the property-first workflows people recognize from rental management tools such as Buildium and Apartments.com, with the account ledgers, schedules, balances, and borrower histories found in loan-servicing software.

The product should feel calm and minimal. It should make routine bookkeeping faster, while keeping every recorded amount traceable to a date, property, account, and source. It is initially a recordkeeping and portfolio-management tool; payment processing is outside the initial scope.

## Product principles

1. **Property first.** Start from a property, then see its rental or financing accounts, income, costs, documents, and balance history.
2. **Record a transaction quickly.** A frequent task should take only a few clear fields: property/account, amount, date, category, and optional memo.
3. **Keep the ledger explainable.** Store original transactions and derive payment status from them. Preserve legacy allocation data for imported history, but routine loan receipts are simple payment records. Do not silently rewrite history when terms change.
4. **Private by default.** Each workspace is private to its owner and people the owner explicitly adds. Invited household members can manage the whole workspace. Enforce access in database policies, not just in the interface.
5. **Make imports reviewable.** Support manual app entry and CSV imports. Show mapped fields and validation errors before writing imported records.
6. **Stay focused.** Avoid heavyweight enterprise dashboards, payment processing, maintenance dispatch, tenant screening, and legal automation until users ask for them. Basic property issue notes and agreement history can remain lightweight.

## People and use cases

PropertyDesk has two distinct experiences: an owner/manager workspace and an optional tenant/buyer portal. The initial owner is a small property owner who may keep rentals, land contracts, and private notes in one portfolio. Owners may have existing records in Buildium-like software, spreadsheets, statements, or screenshots. Tenants and buyers never need to create an account to receive enabled email notices or to keep paying outside the app.

Primary jobs:

- Add a property and attach one or more accounts to it.
- Quickly record rent, an installment payment, a partial payment, or another receipt.
- Record an expense for repairs, contractors, taxes, insurance, or other property costs.
- Track lease security deposits, land-contract down payments, scheduled installments, late charges, interest, principal, and other useful agreement amounts separately and traceably.
- See collected income, expenses, net cash flow, remaining loan principal, and upcoming or overdue items by property and across the portfolio.
- Import historical data before regular use, or keep making entries in the app while optionally backfilling data later.
- Set a display name and add or remove trusted recordkeeping collaborators by verified account email. Members have whole-workspace access, including agreements and transactions.
- Label properties with one or more workspace members for sorting and filtering. These labels do not limit or grant access.
- Export records for backup, tax preparation, or spreadsheet review, with a dated complete data backup available as JSON or ZIP.
- Optionally invite a buyer/tenant to a separate, narrowly scoped portal for their own account.
- Enable email notices independently of portal access; notices are off by default.

Tenant/buyer jobs, only if invited and they choose to sign in:

- See only the account(s) the owner explicitly shared with them, including selected due dates, payment history, and balance details.
- Update their contact email or notification preference, if the owner enables those controls.
- Contact the owner using the configured reply-to address. The portal does not collect or process payments in the initial release.

## Navigation and information architecture

Keep the primary navigation small. After sign-in, land on **Properties**, the primary day-to-day screen; Overview remains available as a secondary summary.

- **Overview:** portfolio totals, upcoming items, recent activity, and properties.
- **Properties:** the only portfolio navigation view; fold the former Accounts functionality into this screen. Use a searchable, filterable account-style grid with payment action and unpaid-due amount as the first columns, followed by a clickable street address, renter/buyer, scheduled amount, and estimated loan balance. Keep rows in a stable A–Z order by renter/buyer name, then account name and address; put properties without accounts last. Show an optional short property note in italic below the street address; make it quickly editable from the grid and searchable with the other property fields. The loan balance always assumes on-time installments and is independent of recorded receipts. Do not show a Type column. Hide inactive accounts and archived properties by default; let the user reveal them with a Show inactive / archived toggle. On narrow screens, keep Payment and Unpaid Due pinned while the remaining columns scroll horizontally. In the property detail account table, let account name and party name open the account editor; keep the Open action on one line and remove the redundant Status column. Properties without an agreement remain visible with an Add account action. Show the street address once as the link; omit city/state/postal details and duplicate subtext from this view.
- **Workspace:** display name and whole-workspace member management. Only the owner can add or remove members. At this stage, a member must already have a verified PropertyDesk account; adding the email grants access immediately and does not send an invitation email.
- **Agreements and parties:** preserve original signed terms and documents, then record amendments as dated versions. Keep prior occupants/buyers and agreements in history while making current parties and terms easy for the owner to update.
- **Separate agreement terms from ledger balance:** preserve signed original principal, down payment, fixed rate, term, installment amount, due-date rules, and any late-charge terms while allowing an owner-set opening balance and its as-of date. Agreement-only imports may initialize the ledger balance at $0 until historical payments establish a trustworthy starting point.
- Store a tenant/buyer email only when provided by the owner or clearly identified in the agreement; reminder messages remain disabled until explicitly enabled and configured.
- **Transactions:** income and expenses in a unified, filterable ledger.
- **Reports:** income, expenses, net cash flow, balances, tax-preparation summaries, and export/import.

Property detail is the organizing screen. It should show the address, current and prior agreements/occupants, related accounts, recent income and expenses, optional attachments or source references, and property-level totals. Agreement files belong in a private Supabase Storage bucket. Their filenames are the links: opening one uses a short-lived signed URL, and the browser provides viewing or downloading as supported by the file type. Do not add a duplicate in-app Download button. Supported agreement formats are PDF, DOCX, and JPEG; never cache private files in the PWA shell. Do not require unit counts, bedroom counts, or other residential inventory detail for the basic workflow. Account detail holds current and prior agreement terms, payment history, deposits, charges, the estimated on-time schedule balance, and (for loans) an amortization schedule with assumptions and an as-of date.

The owner workspace and tenant/buyer portal must have distinct navigation and authorization. Owner workspace members can access every workspace record. Property holder labels are organizational only. Portal users do not see owner dashboards, property expenses, other accounts, portfolio reports, imports, or administrative settings. Any future buyer/tenant portal sharing must be account-specific and explicit; account access is not inherited from workspace membership, matching email addresses, or property labels. Share only the customer's own landlord/seller/creditor account; never expose an owner's own buyer/borrower obligation in the buyer/tenant portal. Agreement documents must also be explicitly selected for that account before portal access.

## Key workflows

### Fast income entry

Provide a persistent **Record income** action. When opened from a property, preselect that property and let the user choose an account if there is more than one. Required fields are property/account, amount, and received date. Default the date to today. Payment method and memo are optional. For a rental, categorize the receipt as rent, late fee, security deposit, deposit refund, or other receipt; track a security deposit as a separate liability/balance and do not count it as rent income. For a note or land contract, quickly record the gross installment amount, date, method, and optional memo without requiring a principal/interest/escrow split. The receipt log determines whether a scheduled installment is unpaid; it does not change the hypothetical on-time loan balance.

Support entering several receipts in sequence without returning to the portfolio overview. Make the next due date and last payment visible on each account so monthly bookkeeping can be done with a short scan.

Maintain an expected schedule separately from actual receipts. The schedule describes rent installments or fixed loan due dates and amounts; it does not post income. For loans it drives the hypothetical on-time balance, even when no receipt is logged. Support partial, missed, early, and extra payments, with the received date and covered due period recorded separately when needed.

For rentals, allow the owner to record a lease/security-deposit amount, held balance, receipt date, and eventual refund or amount retained with an explanation. A deposit receipt is linked to its cash receipt, a refund is linked to a rental-account expense categorized as a deposit refund, and a retention/restoration is a non-cash liability adjustment with a reason. Keep all deposit movements distinct from rent and operating expense totals, and show their effect on held balance. The product records owner-entered deposit handling; it does not determine legal compliance or custody requirements.

### Expense entry

Provide a persistent **Record expense** action, available from the portfolio and property detail. Required fields are property, amount, date, and category. Optional fields include related account, payee/contractor, payment method, memo, and receipt attachment. Receipt uploads and other supporting documents are useful but optional. Seed categories with repairs, contractor labor, materials, taxes, insurance, utilities, management, security deposit refunds, and other. Deposit refunds require a rental account, update the held-deposit ledger, and remain outside operating expense totals. Allow the owner to correct transaction details without losing the original values and edit history.

For this initial bookkeeping workflow, expenses reduce property cash flow but do not change loan principal or rental account balances. Track reimbursements or refunds as separate linked transactions when supported.

### Land contract and note payment tracking

Store each received installment as a dated transaction with amount, method, memo, and audit history. Do not ask the owner to split a receipt into principal, interest, escrow, or fees during routine entry. For notes and land contracts, Unpaid Due is based on scheduled installments less posted receipts; it is the primary payment-status measure and carries forward month over month. The displayed Estimated Loan Balance is a separate hypothetical figure derived from the agreement's standard amortization schedule as if every installment was paid on time, independent of actual payment records. Use the original principal, rate, term, start/effective date, and contractual P&I (commonly 360 months, or 240 for applicable Altoona agreements), plus the owner-editable signed adjustment. Label it clearly as a working estimate, not a payoff quote. Owners can correct terms and transaction details easily, while retaining who changed what and when. A transaction correction atomically voids the original and inserts a linked replacement, with a required reason; preserve both records and their audit events, and exclude the voided amount from current calculations. Also provide a standalone owner-only void/reversal action with reason and timestamp.

For fixed-rate land contracts and notes, display original principal, down payment, estimated on-time balance, scheduled payment, next due date, interest rate, term, maturity/balloon date, late-charge terms, and amendments. Generate a standard amortization table from active fixed-rate terms, showing assumptions, effective date, and an as-of balance. The displayed balance always advances along the agreement schedule as if each installment was paid on time; actual receipts and missed payments never alter it. Let the owner apply a signed adjustment to the estimate at any time to represent their negotiated working figure. An amendment creates a new dated term version and schedule from its effective date; keep prior schedules and payment history available and do not recast previous payments automatically. Calculate or suggest late charges when an installment passes its due date plus agreement grace terms, show the calculation, and let the owner review or correct it. These figures are bookkeeping estimates, not payoff quotes or legal determinations. Any future buyer-facing balance must be marked as an estimate.

### Agreement and occupant changes

Keep a simple address-based property record as the anchor. An owner can update the current occupant/buyer and agreement when a new agreement or amendment applies to the same address. Preserve earlier agreement versions, parties, effective dates, and optional signed-document attachments so historical receipts and tax summaries remain understandable. Do not require bedrooms, unit inventory, lease renewal workflows, or extensive property classification in the initial design.

### Tax preparation and backup export

Provide owner-reviewed annual summaries that make common Schedule E and installment-sale inputs easier to assemble, then let the owner file in their chosen tax software. Keep source ledger detail and category totals exportable. For rentals, track gross rent, late fees/other income, and familiar expense categories such as mortgage interest, taxes, insurance, repairs, utilities, and depreciation reference amounts. Track security-deposit receipts, held balances, refunds, and amounts retained separately from rent receipts; leave tax characterization of retained deposits to the owner/tax professional. For land contracts/notes, track property acquired/sold dates, sale price, down payment, gross installment receipts, principal, interest, late charges, selling expenses, adjusted basis/installment-sale basis reference amounts, and owner-entered tax figures such as contract price or gross-profit percentage when available. Keep these as source facts or owner-entered references; do not silently calculate tax treatment, tax liability, or file Form 6252. Label summaries as preparation aids and allow category edits and detailed export. Tax category lists should be editable because treatment depends on facts and may change.

Offer **Export everything** as a dated ZIP containing a JSON backup, manifest/schema version, and user-uploaded supporting agreement files. Include properties, current and prior agreement/occupant versions, schedules and assumptions, transactions and any legacy allocations, deposit/charge records, import receipts, audit history, and uploaded files. Assemble the ZIP in the authenticated browser session and never send it to a third party. Show the export date and data scope. If restore is not initially supported, say so clearly and keep the export usable without the app.

### Import and AI-assisted backfill

Any user may ask ChatGPT to convert their records or screenshots into a PropertyDesk CSV, then import that file through their authenticated PropertyDesk session. PropertyDesk itself does not send customer data to an AI service or read, upload, or parse screenshots. The app validates and previews the CSV locally before saving it to that user's Supabase workspace. App entry and CSV imports converge on the same validated transaction format. Direct database backfills remain an owner/admin workflow and must still pass RLS and database constraints.

Import flow:

1. Parse a CSV into a staging preview before saving it.
2. Match property and account names, dates, amounts, categories, and parties. Flag uncertain or missing values.
3. Detect possible duplicate transactions using property/account, date, amount, and memo/source note. Label each suspected row in the preview and exclude it from the default import selection so re-uploading a file does not silently create duplicates. Let the owner explicitly include a suspected duplicate when the match is intentional.
4. Let the owner review and correct editable values directly in the local preview, then explicitly commit them. If the CSV structure itself is malformed, identify the source row and require the file to be fixed and reselected.
5. Preserve source metadata (filename or owner-entered source note, import batch, and import timestamp) so entries can be traced.
6. Produce a row-level success/error report and permit safe re-import without duplication.

ChatGPT-assisted transcription happens in the user's own ChatGPT workflow and is a convenience, not an authoritative source. The user reviews ambiguous values before importing. PropertyDesk must never ask users to paste Supabase credentials, API keys, or service-role secrets into ChatGPT. If a user sometimes uses the app while also backfilling, duplicate detection and transaction provenance are essential.

## Minimal visual design

Use dark mode as the default appearance, with a visible light/dark toggle and a remembered device preference. The light theme uses a warm-gray canvas, white surfaces, subtle borders, and dark green primary actions; the dark theme preserves readable contrast, including for Unpaid Due and payment-status cells. Keep muted colors restrained and typography clear. Prefer compact tables and plain language over charts and decorative illustrations. Show portfolio totals as a few high-value cards, then put the actual transactions and property records close at hand.

Forms should default dates and known property/account values, accept decimal amounts, work well on mobile, and make save confirmation obvious. Use a single unified ledger with clear income/expense labels and filters rather than separate complex accounting modules.

## Data model

Core tables in the current Supabase schema use the `pd_` project prefix:

- `pd_properties`: owner, address, display name, notes; do not require unit or bedroom classification.
- `pd_accounts`: owner, property, account type (`rental`, `land_contract`, `note`), current party and private contact fields (email and optional phone), status, active agreement version, simple due schedule, and owner-editable signed adjustment to the estimated loan balance. Contact fields are visible to authorized workspace members only and covered by the same RLS policies and private backup handling as other account records.
- `pd_documents`: owner, property/account, private Storage object path, filename, MIME type, file size, and timestamp. Access is restricted to its owner by both table RLS and Storage object policies.
- Agreement history (for example `pd_agreements`): account/property, parties, effective dates, agreement type, fixed principal/sale amount, down payment, fixed interest rate, term, installment amount, due date/grace period, late-charge rule, maturity/balloon date, tax-preparation reference fields, and optional document reference. Preserve superseded terms on amendment rather than overwriting them.
- pd_payments: owner, account, gross amount, received date, covered due period, method, memo, source/import batch, legacy allocation fields retained for imported history, and correction/reversal audit metadata. New loan receipts do not require an allocation.
- Expected charges or schedule rows (for example `pd_scheduled_items`): account, due date, expected amount, charge type, agreement version, and status. These are separate from actual transactions and support rental due status and loan installment tracking.
- Deposit records (for example `pd_deposit_entries`): rental account, transaction date, received/refunded/retained/restored movement type, amount, reason, and linked payment or expense for cash movements. Keep security-deposit held balances distinct from earned income and operating expenses.
- `pd_expenses`: owner, property, optional account, amount, expense date, tax/reporting category, payee, method, memo, optional receipt path, source/import batch, and correction/reversal history.
- `pd_import_batches`: owner, filename or description, created/committed timestamps, row counts and status. Avoid retaining raw uploaded financial documents by default; keep only what is needed to audit the imported rows.
- `pd_audit_events`: owner, entity, action, timestamp, prior/new values or a safe change summary; include agreement amendments and owner corrections.
- Dated export manifest: export timestamp, schema version, included record/file counts, and format version; backup files remain private and are generated only for the authenticated owner.
- Future portal support: a `pd_account_portal_access` table linking one authenticated portal user to an explicitly shared account, plus separate invitation/verification state. Do not grant portal users access to owner-scoped tables directly; expose a narrow, tested view or server-side API that returns only the approved account ledger fields.
- `pd_reminder_logs`: owner/account, recipient, reminder month, delivery status, provider message id, safe result metadata, and unpaid amount; apply workspace RLS and do not retain rendered message bodies or provider credentials. Reminder enablement is stored per account and defaults off. Buyer/tenant addresses remain private account contact data. The current notices do not CC or copy the owner.

Use decimal/numeric storage for money. Use ISO calendar dates for due/effective/transaction dates and UTC timestamps for audit metadata. Add checks for valid signs by transaction type, allowed categories/types, and correct ownership relationships. Enable row-level security on every owner-scoped table. Authenticated reads and writes must be scoped to `auth.uid()`; child records must also reference a parent owned by that user. Never put a Supabase service-role key or private secret in the static GitHub Pages app.

## Portfolio calculations

- **Income collected:** sum of posted income receipts in the selected period; refundable security-deposit receipts remain cash received but are excluded from income and operating net cash flow.
- **Expenses:** sum of posted operating/capital expense transactions in the selected period, with owner-editable reporting categories.
- **Net cash flow:** income minus expenses; keep loan principal and interest separately reportable.
- **Loan balance:** the agreement's hypothetical on-time amortization balance, plus any owner-entered signed adjustment; payment receipts do not affect this figure.
- **Estimated loan balance:** always use standard amortization from the current agreement principal, rate, term, start/effective date, and P&I payment through the as-of date, assuming every installment was paid on time. Do not use receipt history or loan payment allocations to change this hypothetical amount. Apply the owner-editable signed adjustment. Show this estimate separately from Unpaid Due and label it as a working estimate, not a payoff quote.
- **Carry-forward unpaid charges:** For rentals, land contracts, and notes, begin tracking unpaid charges from 2026-10-01 because earlier payment history is incomplete; do not assume January–September installments are unpaid. Include the current month's installment immediately, even if its contractual due day is later in the month; treat it as unpaid unless a posted non-deposit/non-late-fee receipt for that account has been recorded by the as-of date. Subtract posted receipts through the as-of date; unpaid amounts roll into later months.
- **Rental balance:** calculate amount due only from posted expected charges minus linked receipts/credits as of a stated date. Track security deposits separately as held, refunded, or retained amounts.
- **Late charges:** derive eligibility from each due date plus agreement grace period; show the rule and calculated charge and preserve owner overrides.
- **Scheduled amount:** show upcoming expected rent installments or fixed loan payments without treating them as received income; normalize frequency only for summaries and label estimates.
- **Tax preparation:** annual exports group owner-reviewed categories and expose underlying transactions; held deposits are distinct from rent receipts, and loan principal and interest remain separate. The app does not infer tax treatment for retained deposits.

Calculations must be reproducible from ledger rows and must be covered by examples with partial payments, overpayments, refunds/reversals, and backdated entries before broader use.

## Privacy and security

Each owner account is a private workspace. Enforce row-level security for properties, accounts, payments, expenses, import batches, attachments metadata, audit events, and holder labels. Workspace membership must be managed only by owner-checked database functions. Store uploads in a private Supabase Storage bucket with workspace-path policies and short-lived signed links. Validate workspace ownership again in database policies for every child insert. Use the public anon key only in the static client; keep service-role access in trusted server-side jobs only.

Portal authentication is optional and separate from owner access. An invitation can only grant access to a specific account after the owner explicitly shares it and the invitee verifies control of their email. A portal identity must never inherit the owner's user id or receive access through a broad owner policy. Use a separate portal authorization model and narrow server-side interface; test that a portal user cannot enumerate properties, read expenses, or access another account by changing an id. Email delivery remains independent of portal identity: notices can go to a verified contact without an app login, and all buyer/tenant notices stay disabled until enabled by the owner.

Do not expose records in public pages, search indexes, logs, client error reports, or shared links. Use HTTPS in transit and Supabase-managed encryption at rest; enforce row-level security and private storage. Client-side CSV parsing and preview should avoid unnecessary copies and clear parsed data from memory after import. Provide account deletion/export controls and recommend a separate backup. Support a dated, private JSON/ZIP export of all owner records and uploaded files. Do not store bank credentials or payment card details. If payment processing is added later, use a provider-hosted/tokenized flow and assess servicing, consumer protection, money-transmission, tax, and privacy requirements first.

Supabase-managed encryption at rest and TLS are the first-release baseline, but they do not mean that data is end-to-end encrypted from the service operator. True client-side encryption would require each user to keep a separate recovery key and would limit server-side search, reporting, and account recovery. Do not claim end-to-end encryption unless that design is implemented and independently reviewed.

For this product, prioritize correct RLS, least-privilege database grants, secure account recovery, and private backups before considering field-level encryption.

The owner sign-in screen must provide password recovery through Supabase Auth. Recovery links must return to the deployed app, accept a new password only with the verified recovery session, and show generic request feedback so the page does not reveal whether an email address has an account.

## Progressive web app

Use a dark color theme by default on first visit. Provide a visible light/dark toggle on sign-in and workspace screens, and remember each device/browser preference locally without syncing a theme preference to the workspace. Keep the status bar and standalone PWA shell colors aligned with the active theme.


Ship PropertyDesk as an installable PWA for phone and desktop use. The web app manifest must include compatible 192×192 and 512×512 PNG icons in addition to any scalable SVG icon. The service worker may cache the static app shell only. Do not cache authenticated API responses, tokens, property/account data, or uploaded documents in Cache Storage. The first release supports on-the-go use when connected; it does not queue financial writes offline. Offline transaction queues would need unique idempotency keys, visible sync status, conflict handling, and device logout/lock behavior before being enabled.

## Source and module architecture

Keep the app build-free and compatible with GitHub Pages. Place cohesive browser features such as portfolio, transaction, detail, private document, backup/export, sign-in/recovery, workspace settings, and property/account/transaction entry and CSV-import workflows in small files under `features/`; keep reusable calculations and validation in their existing helper modules. `app.js` owns shared session state and connects feature modules to Supabase and the page. Load every feature before `app.js` and include it in the service-worker shell cache. When a feature changes, update its focused tests and preserve the product workflows above.

## Transactional email

Use Resend for Supabase Auth only if a separately owned, accepted domain is available. The free `propertydesk.dynv6.net` hostname was rejected by Resend; buyer/tenant reminders use MailerSend through a Supabase Edge Function. Provider credentials stay in Supabase secrets, never the static browser app.

### Buyer and tenant notices

Email notices do not require a buyer/tenant portal account. The implemented first reminder is an optional month-end unpaid reminder, disabled by default for every account. Owners enable it on the account only after adding a recipient address. On the last calendar day in America/New_York, send only if no posted rent/installment/other payment was recorded for that account in that calendar month and an unpaid scheduled amount remains. Exclude security deposits and late-fee-only entries from the payment check. Skip paused/closed accounts. Recheck due status immediately before sending. Automatic late reminders and mid-month notices remain deferred; the Properties grid can open a manual reminder draft with the same message content for the owner to review and send.

Provide an owner/admin preview from the account editor using current account data; label it clearly as a preview and never send from that screen. Show recipients, subject, and body before enabling reminders. The message reports the app's rolling Unpaid Due as of month end; it does not include the hypothetical loan balance or represent an official payoff quote.

Include only the minimum information needed: recipient name, property address, reminder month, and unpaid amount with an as-of date. Never include full account numbers, credentials, or unnecessary contract details. Send separate messages to co-buyers/tenants so their email addresses are not disclosed to each other. Log the recipient, month, status, provider message id, and a sanitized result without storing rendered message bodies or credentials. Make the log visible only to the owning workspace and ensure the scheduled job checks account and payment status immediately before each send.

The current release sends only to the tenant/buyer contact addresses. It does not CC the owner or copy other addresses. Future reply/copy options must be explicit and default off.

Domain setup status and exact DNS records are tracked in `email-setup.md`; never guess DNS values. Reminder settings and delivery logs use `pd_` tables with workspace RLS. MailerSend acceptance is logged as provider acceptance, not guaranteed inbox delivery. All account toggles remain off until the owner enables them.

## Delivery stages

1. **Private portfolio foundation:** authentication, RLS, properties, accounts, per-user workspace, export.
2. **Daily ledger:** quick income entry, expense entry, property detail, searchable transaction ledger, simple cash-flow summaries.
3. **Agreement and ledger tracking:** address-based owner records, agreement/occupant history, rental charges and security deposits, fixed-rate amortization schedules, down payments, fast payment logging, late-charge dates, statements, and audit history.
4. **Historical imports:** CSV template and staging preview, duplicate checks, and import receipts. Users may prepare files with their own AI assistant; PropertyDesk does not need an AI API integration for the initial flow.
5. **Tax and optional integrations:** Schedule E/installment-sale preparation summaries, optional receipt/document storage, borrower portal, and only later payment collection if validated.

## Product boundaries and open decisions

- Initial release records payments; it does not initiate or collect them.
- Expenses default to property-level with an optional account link; allow owner edits while retaining change history.
- Track rental charges and deposits so amount-due and held-deposit figures have explicit ledger support.
- Support fixed-rate standard amortization and dated amendments; leave variable rates and non-standard servicing outside the current product scope.
- Define report categories and owner-entered tax reference fields that make Schedule E and installment-sale filing easier without attempting to determine tax treatment.
- Confirm day-count, due-date, grace-period, and late-charge conventions against actual agreements before relying on calculations.
- Decide whether a later owner-facing portal should show any estimated balance; any displayed figure must show its as-of date and non-payoff status.
- Define JSON/ZIP backup format and whether restore is included in the first export release.
- Confirm the user's jurisdiction and data-retention needs before adding legal notices, contract generation, payment collection, or compliance claims.

## Success measures

- A typical payment receipt or expense can be recorded in under 20 seconds without requiring loan allocation math.
- An owner can find a property’s collected income, costs, Unpaid Due, and hypothetical on-time loan balance without exporting to a spreadsheet.
- An import preview makes ambiguous and duplicate rows visible before commit, without sending the data to an AI provider.
- A user can export their complete records and can verify that a second user cannot read or change them.
- Recording, correcting, or voiding receipts changes Unpaid Due and payment history but never changes the on-time schedule balance.
- An owner can update an agreement or occupants while viewing the prior version that explains historical ledger entries.
- A dated backup contains the owner's complete records and uploaded files in a documented format.
