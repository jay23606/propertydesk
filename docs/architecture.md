# PropertyDesk browser architecture

PropertyDesk is a plain HTML, CSS, and JavaScript app with no build step. Browser scripts are loaded in dependency order from `index.html`; their public feature APIs are exposed on `window.PropertyDesk*` globals.

## Entry point

`app.js` is the composition root. It creates shared runtime services, supplies explicit dependencies to feature workflows, and connects their renderers and event binders. Keep it focused on wiring rather than moving domain rules or UI behavior into it.

`features/app-startup-workflow.js` joins authentication and `features/app-lifecycle.js`. The lifecycle attaches events, registers the service worker, initializes the backend, restores the auth session, and calls the renderers when workspace data changes.

## Workspace data and access

The root-level workspace modules and `features/workspace-runtime.js` create the authenticated backend, shared state, repositories, scoped queries, and refresh pipeline. Repositories resolve the active authenticated client when an operation runs. Feature workflows receive repositories and callbacks; they do not pass Supabase clients through the UI.

`workspace-table-catalog.js` is the shared inventory for workspace reads and backups. `workspace-data.js` hydrates app state, `workspace-query.js` scopes and pages reads, and `workspace-refresh.js` coordinates loading and rendering. Row-level security and database grants remain the access boundary.

## Feature workflows

- **Properties and overview:** `features/property-workspace-workflow.js` connects the Properties grid, overview, and property detail actions. Portfolio models own sorting, filtering, payment status, totals, and reminder-link content.
- **Property and account entry:** `features/property-account-forms-workflow.js` composes the property and account forms. Payment and expense forms remain separate because they have different validation and transaction behavior.
- **Accounts and deposits:** `features/account-deposit-workspace-workflow.js` joins account details with rental deposit details and adjustments. The account and deposit workflows keep their calculations, persistence, and event handling in focused modules.
- **Transactions:** `features/transaction-workspace-workflow.js` composes transaction records with correction and void maintenance. Corrections preserve the original entry and link its replacement; voids preserve the audit trail.
- **Reports and data transfer:** `features/report-workspace-workflow.js` connects report rendering with CSV export. `features/imports.js` coordinates account, payment, and expense imports; `features/backup-workspace-workflow.js` builds workspace ZIP backups with private agreement files.
- **Workspace settings:** `features/app-shell-workflow.js` joins workspace settings and navigation. Profile, member access, reminder activity, and theme controls remain separate concerns.
- **Private agreements:** Property document workflows use a workspace-scoped repository for upload, deletion, and short-lived signed links.

## Shared domain logic

Keep reusable rules in focused modules rather than duplicating them in views. Date, currency, and display helpers are separate from account-type and transaction-option catalogs. Financial context modules compose rolling unpaid-due calculations, on-time amortization estimates, posted transaction summaries, and held-deposit balances for use by screens and forms.

Manual reminder drafts and automated reminders share the message builder in `supabase/functions/_shared/reminder-copy.js`. The month-end reminder function owns its authorization, eligibility checks, delivery, and activity logging; reminders remain disabled by default.

## Browser scripts and PWA cache

Every browser feature script must be loaded by `index.html` after its dependencies and included in the service worker's `SHELL_FILES` list. When a cached shell file changes, increment `CACHE_NAME` in `sw.js`. The worker caches the static shell only; it must not cache authenticated responses or workspace records.

Styles are layered by purpose: `styles.css` provides the base, `overrides.css` holds layout adjustments, `reminders.css` owns reminder controls, and `theme.css` owns light and dark mode rules. Keep theme-specific overrides in `theme.css` so the selected palette is applied after feature styles.

## Verification

Use `npm test` for module and feature-boundary tests, `npm run lint` for undefined or unused names, and `npm run format:check` for browser code and tests. GitHub Actions runs those checks and a candidate Chromium smoke test before deployment. After deployment, run `npm run smoke:deployed -- https://jay23606.github.io/propertydesk/` to verify the live app and signed-in workflows.
