# PropertyDesk browser architecture

PropertyDesk is a plain HTML, CSS, and JavaScript app with no build step. Browser scripts are loaded in dependency order from `index.html`; their public feature APIs are exposed on `window.PropertyDesk*` globals.

## Entry point

`app.js` is the feature composition root. It supplies explicit dependencies to feature workflows and connects their renderers and event binders. `features/app-services.js` constructs shared write feedback, reminder, notification, workspace runtime, financial, and deposit services before feature wiring begins. Keep both modules focused on composition rather than moving domain rules or UI behavior into them.

Workflow coordinators pass only the dependencies each child needs instead of forwarding a whole app context. Those explicit mappings keep feature boundaries visible and make accidental coupling easier to spot.

`features/app-startup-workflow.js` joins authentication and `features/app-lifecycle.js`. The lifecycle attaches events, registers the service worker, initializes the backend, restores the auth session, and calls the renderers when workspace data changes.

## Workspace data and access

`features/app-services.js` creates the shared runtime through `features/workspace-runtime.js`; the root-level workspace modules supply the authenticated backend, shared state, repositories, scoped queries, and refresh pipeline. Repositories resolve the active authenticated client when an operation runs. Feature workflows receive repositories and callbacks; they do not pass Supabase clients through the UI.

`workspace-table-catalog.js` is the shared table inventory for workspace operations, and `workspace-read-catalog.js` explicitly lists the records hydrated into the client. `workspace-data.js` runs that read catalog to hydrate app state, `workspace-query.js` scopes and pages reads, and `workspace-refresh.js` coordinates loading and rendering. Row-level security and database grants remain the access boundary.

## Feature workflows

- **Properties and overview:** `features/property-workspace-workflow.js` connects the Properties grid, overview, and property detail actions. Portfolio models own sorting, filtering, payment status, totals, and reminder-link content. Quick notes and archive/restore writes share the owner-scoped refresh path in `features/property-record-update-maintenance.js`; holder labels remain a separate set-replacement workflow.
- **Property and account entry:** `features/property-account-forms-workflow.js` composes the property and account forms. Payment and expense forms remain separate because they have different validation and transaction behavior.
- **Accounts and deposits:** `features/account-deposit-workspace-workflow.js` joins account details with rental deposit details and adjustments. The account and deposit workflows keep their calculations, persistence, and event handling in focused modules; close and deposit maintenance receive only the record-save operation they need.
- **Transactions:** `app.js` composes transaction correction/void maintenance separately from `features/ledger-workflow.js`, which joins payment/expense entry forms with transaction history and delegated row actions. Maintenance receives the run-and-refresh operation for audited correction and void writes. `features/transaction-association-model.js` joins loaded payment/expense rows to account and property records and builds search text; `features/transaction-display-row-model.js` then projects only table fields, keeping workspace identifiers and search-only values out of the display shape. Corrections preserve the original entry and link its replacement; voids preserve the audit trail.
- **Reports and data transfer:** `features/report-workspace-workflow.js` connects report rendering with CSV export. `features/import-validation-workflow.js` composes account, payment, and expense validators and supplies them to the import workspace; `features/imports.js` coordinates account and transaction import actions, with transaction-specific validation rules retained. `features/backup-workspace-workflow.js` builds workspace ZIP backups with private agreement files.
- **Workspace settings:** `features/app-shell-workflow.js` joins workspace settings and navigation. Profile updates receive only the shared write runner, while `features/workspace-member-maintenance.js` receives only the run-and-refresh operation it needs for membership confirmation, persistence, and uncertain-response reconciliation. Reminder activity and theme controls remain separate concerns.
- **Private agreements:** Property document workflows use a workspace-scoped repository for upload, deletion, and short-lived signed links.

## Shared domain logic

Keep reusable rules in focused modules rather than duplicating them in views. Date, currency, and display helpers are separate from account-type and transaction-option catalogs. `features/date-utils.js` owns the shared clock and ISO timestamps as well as calendar formatting and boundaries. Financial context modules compose rolling unpaid-due calculations, on-time amortization estimates, posted transaction summaries, and held-deposit balances for use by screens and forms.

Manual reminder drafts and automated reminders share the message builder in `supabase/functions/_shared/reminder-copy.js`. The month-end reminder function owns its authorization, eligibility checks, delivery, and activity logging; reminders remain disabled by default.

## Browser scripts and PWA cache

Every browser feature script must be loaded by `index.html` after its dependencies and included in the service worker's `SHELL_FILES` list. When a cached shell file changes, increment `CACHE_NAME` in `sw.js`. The worker caches the static shell only; it must not cache authenticated responses or workspace records.

Styles are layered by purpose: `styles.css` provides the base and app shell, `shared.css` owns reusable components, and the feature stylesheets own their screens and controls: `auth.css`, `portfolio.css`, `overview.css`, `reports.css`, `reminders.css`, `workspace-settings.css`, `property-details.css`, `account-form.css`, `account-history.css`, `imports.css`, and `ledger.css`. Keep a component's light and dark rules together in the stylesheet that owns it. `theme.css` owns theme variables and global app chrome, and remains last in the stylesheet order for rules that apply across the app.

## Verification

Use `npm test` for module and feature-boundary tests, `npm run lint` for undefined or unused names, and `npm run format:check` for browser code and tests. GitHub Actions runs those checks and a candidate Chromium smoke test before deployment. After deployment, run `npm run smoke:deployed -- https://jay23606.github.io/propertydesk/` to verify the live app and signed-in workflows.
