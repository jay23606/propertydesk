const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCSV, selectImportRows } = require('../import-utils.js');
const { validateAccountRows, validateExpenseRows, validatePaymentRows } = require('../import-workflows.js');

test('every local deferred script loads before app.js and is included in the PWA shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const localScripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\bdefer\b/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter((source) => source && !/^https?:\/\//i.test(source))
    .map((source) => source.split('?')[0].replace(/^\.\//, ''));
  const shellMatch = worker.match(/const SHELL_FILES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(shellMatch, 'service worker defines its shell file list');
  const shellFiles = new Set(
    [...shellMatch[1].matchAll(/["']([^"']+)["']/g)]
      .map(([, source]) => source.replace(/^\.\//, '')),
  );
  const appIndex = localScripts.indexOf('app.js');
  assert.notEqual(appIndex, -1, 'app.js is loaded');
  assert.equal(appIndex, localScripts.length - 1, 'app.js is the last local deferred script');
  for (const source of localScripts) {
    assert.ok(shellFiles.has(source), `${source} is cached by the service worker`);
  }
});

test('the browser loads tested import and backup workflows before the app and precaches them in the PWA shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(html.indexOf('features/app-state.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/app-lifecycle.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/backend-client.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('import-workflows.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/import-preview-rendering.js') < html.indexOf('features/import-preview.js'));
  assert.ok(html.indexOf('features/import-preview.js') < html.indexOf('features/import-preview-events.js'));
  assert.ok(html.indexOf('features/import-preview-events.js') < html.indexOf('features/imports.js'));
  assert.ok(html.indexOf('features/import-preview.js') < html.indexOf('features/imports.js'));
  assert.ok(html.indexOf('features/account-import.js') < html.indexOf('features/imports.js'));
  assert.ok(html.indexOf('features/payment-import.js') < html.indexOf('features/transaction-imports.js'));
  assert.ok(html.indexOf('features/expense-import.js') < html.indexOf('features/transaction-imports.js'));
  assert.ok(html.indexOf('features/transaction-imports.js') < html.indexOf('features/imports.js'));
  assert.ok(html.indexOf('zip-utils.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-views.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/transaction-views.js') < html.indexOf('features/transaction-workflow.js'));
  assert.ok(html.indexOf('features/transaction-view-events.js') < html.indexOf('features/transaction-workflow.js'));
  assert.ok(html.indexOf('features/transaction-correction-form.js') < html.indexOf('features/transaction-workflow.js'));
  assert.ok(html.indexOf('features/transaction-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/report-views.js') < html.indexOf('features/report-workflow.js'));
  assert.ok(html.indexOf('features/report-export.js') < html.indexOf('features/report-workflow.js'));
  assert.ok(html.indexOf('features/report-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/app-utils.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/ledger-context.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-form.js') < html.indexOf('features/property-account-forms.js'));
  assert.ok(html.indexOf('features/account-form.js') < html.indexOf('features/property-account-forms.js'));
  assert.ok(html.indexOf('features/property-account-forms.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-account-forms.js') < html.indexOf('features/entry-workflow.js'));
  assert.ok(html.indexOf('features/payment-entry-form.js') < html.indexOf('features/ledger-entry-forms.js'));
  assert.ok(html.indexOf('features/expense-entry-form.js') < html.indexOf('features/ledger-entry-forms.js'));
  assert.ok(html.indexOf('features/ledger-entry-forms.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/ledger-entry-forms.js') < html.indexOf('features/entry-workflow.js'));
  assert.ok(html.indexOf('features/create-actions.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/create-actions.js') < html.indexOf('features/entry-workflow.js'));
  assert.ok(html.indexOf('features/transaction-corrections.js') < html.indexOf('features/entry-workflow.js'));
  assert.ok(html.indexOf('features/entry-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/imports.js') < html.indexOf('features/csv-import-workflow.js'));
  assert.ok(html.indexOf('features/csv-import-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/overview.js') < html.indexOf('features/property-views.js'));
  assert.ok(html.indexOf('features/overview.js') < html.indexOf('features/overview-workflow.js'));
  assert.ok(html.indexOf('features/overview-events.js') < html.indexOf('features/overview-workflow.js'));
  assert.ok(html.indexOf('features/overview-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-portfolio-table.js') < html.indexOf('features/property-views.js'));
  assert.ok(html.indexOf('features/property-portfolio-table.js') < html.indexOf('features/property-portfolio-model.js'));
  assert.ok(html.indexOf('features/property-portfolio-model.js') < html.indexOf('features/property-views.js'));
  assert.ok(html.indexOf('features/property-views.js') < html.indexOf('features/property-portfolio-workflow.js'));
  assert.ok(html.indexOf('features/property-view-events.js') < html.indexOf('features/property-portfolio-workflow.js'));
  assert.ok(html.indexOf('features/property-portfolio-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-details.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-activity-details.js') < html.indexOf('features/property-details-workflow.js'));
  assert.ok(html.indexOf('features/property-details.js') < html.indexOf('features/property-details-workflow.js'));
  assert.ok(html.indexOf('features/property-details-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-activity-details.js') < html.indexOf('features/property-details.js'));
  assert.ok(html.indexOf('features/property-detail-events.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/documents.js') < html.indexOf('features/property-actions-workflow.js'));
  assert.ok(html.indexOf('features/property-management.js') < html.indexOf('features/property-actions-workflow.js'));
  assert.ok(html.indexOf('features/property-quick-note.js') < html.indexOf('features/property-actions-workflow.js'));
  assert.ok(html.indexOf('features/property-detail-events.js') < html.indexOf('features/property-actions-workflow.js'));
  assert.ok(html.indexOf('features/property-actions-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/account-details.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/account-details.js') < html.indexOf('features/account-detail-events.js'));
  assert.ok(html.indexOf('features/deposit-details.js') < html.indexOf('features/deposit-detail-events.js'));
  assert.ok(html.indexOf('features/account-details.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/account-history-details.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/account-detail-events.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/deposit-details.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/deposit-detail-events.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/account-details-workflow.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/documents.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/exports.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/auth-recovery.js') < html.indexOf('features/auth.js'));
  assert.ok(html.indexOf('features/auth-recovery.js') < html.indexOf('features/auth-session.js'));
  assert.ok(html.indexOf('features/auth-session.js') < html.indexOf('features/auth.js'));
  assert.ok(html.indexOf('features/auth-form.js') < html.indexOf('features/auth.js'));
  assert.ok(html.indexOf('features/auth.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/profile-settings.js') < html.indexOf('features/workspace.js'));
  assert.ok(html.indexOf('features/workspace.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/workspace-members.js') < html.indexOf('features/workspace.js'));
  assert.ok(html.indexOf('features/property-management.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-view-events.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/transaction-view-events.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/property-quick-note.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/account-maintenance.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/deposit-maintenance.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/transaction-correction-form.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/transaction-maintenance.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/account-maintenance.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/deposit-maintenance.js') < html.indexOf('features/account-details-workflow.js'));
  assert.ok(html.indexOf('features/transaction-maintenance.js') < html.indexOf('features/transaction-workflow.js'));
  assert.ok(html.indexOf('features/transaction-corrections.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/notifications.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/pwa-registration.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/transaction-maintenance.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/reminder-preview.js') < html.indexOf('app.js'));
  assert.ok(html.indexOf('features/reminder-activity-view.js') < html.indexOf('features/workspace-settings-workflow.js'));
  assert.ok(html.indexOf('features/workspace.js') < html.indexOf('features/workspace-settings-workflow.js'));
  assert.ok(html.indexOf('features/reminder-preview.js') < html.indexOf('features/workspace-settings-workflow.js'));
  assert.ok(html.indexOf('features/workspace-settings-workflow.js') < html.indexOf('app.js'));
  assert.match(worker, /'\.\/import-workflows\.js'/);
  assert.match(worker, /'\.\/zip-utils\.js'/);
  assert.match(worker, /'\.\/features\/import-preview\.js'/);
  assert.match(worker, /'\.\/features\/account-import\.js'/);
  assert.match(worker, /'\.\/features\/transaction-imports\.js'/);
  assert.match(worker, /'\.\/features\/property-views\.js'/);
  assert.match(worker, /'\.\/features\/property-portfolio-workflow\.js'/);
  assert.match(worker, /'\.\/features\/overview\.js'/);
  assert.match(worker, /'\.\/features\/app-state\.js'/);
  assert.match(worker, /'\.\/features\/app-lifecycle\.js'/);
  assert.match(worker, /'\.\/features\/backend-client\.js'/);
  assert.match(worker, /'\.\/features\/transaction-views\.js'/);
  assert.match(worker, /'\.\/features\/transaction-workflow\.js'/);
  assert.match(worker, /'\.\/features\/report-views\.js'/);
  assert.match(worker, /'\.\/features\/report-export\.js'/);
  assert.match(worker, /'\.\/features\/report-workflow\.js'/);
  assert.match(worker, /'\.\/features\/app-utils\.js'/);
  assert.match(worker, /'\.\/features\/ledger-context\.js'/);
  assert.match(worker, /'\.\/features\/property-form\.js'/);
  assert.match(worker, /'\.\/features\/account-form\.js'/);
  assert.match(worker, /'\.\/features\/property-account-forms\.js'/);
  assert.match(worker, /'\.\/features\/payment-entry-form\.js'/);
  assert.match(worker, /'\.\/features\/expense-entry-form\.js'/);
  assert.match(worker, /'\.\/features\/ledger-entry-forms\.js'/);
  assert.match(worker, /'\.\/features\/entry-workflow\.js'/);
  assert.match(worker, /'\.\/features\/create-actions\.js'/);
  assert.match(worker, /'\.\/features\/imports\.js'/);
  assert.match(worker, /'\.\/features\/csv-import-workflow\.js'/);
  assert.match(worker, /'\.\/features\/property-details\.js'/);
  assert.match(worker, /'\.\/features\/property-details-workflow\.js'/);
  assert.match(worker, /'\.\/features\/property-activity-details\.js'/);
  assert.match(worker, /'\.\/features\/property-detail-events\.js'/);
  assert.match(worker, /'\.\/features\/account-details\.js'/);
  assert.match(worker, /'\.\/features\/account-details-workflow\.js'/);
  assert.match(worker, /'\.\/features\/documents\.js'/);
  assert.match(worker, /'\.\/features\/property-actions-workflow\.js'/);
  assert.match(worker, /'\.\/features\/exports\.js'/);
  assert.match(worker, /'\.\/features\/auth-recovery\.js'/);
  assert.match(worker, /'\.\/features\/auth-session\.js'/);
  assert.match(worker, /'\.\/features\/auth-form\.js'/);
  assert.match(worker, /'\.\/features\/auth\.js'/);
  assert.match(worker, /'\.\/features\/workspace\.js'/);
  assert.match(worker, /'\.\/features\/property-management\.js'/);
  assert.match(worker, /'\.\/features\/account-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/deposit-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/transaction-maintenance\.js'/);
  assert.doesNotMatch(worker, /record-maintenance\.js/);
  assert.match(worker, /'\.\/features\/transaction-corrections\.js'/);
  assert.match(worker, /'\.\/features\/notifications\.js'/);
  assert.match(worker, /'\.\/features\/pwa-registration\.js'/);
  assert.match(worker, /'\.\/features\/transaction-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/reminder-preview\.js'/);
  assert.match(worker, /'\.\/features\/workspace-settings-workflow\.js'/);
  assert.match(app, /attachCsvImportEvents,/);
});

const properties = [{ id: 'p1', name: 'Oak House', address: '10 Oak St' }];
const accounts = [
  { id: 'r1', property_id: 'p1', name: 'Oak Rental', account_type: 'rental' },
  { id: 'n1', property_id: 'p1', name: 'Oak Contract', account_type: 'land_contract' },
];

test('account import maps template fields and applies safe defaults', () => {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'templates', 'accounts-template.csv'), 'utf8'));
  const result = validateAccountRows(rows, [], [], '2026-10-03');

  assert.equal(result.errors.length, 0);
  assert.equal(result.total, 1);
  assert.equal(result.valid[0].account_type, 'rental');
  assert.equal(result.valid[0].payment_frequency, 'monthly');
  assert.equal(result.valid[0].start_date, '2026-01-01');
  assert.equal(result.valid[0].original_principal, 0);
  assert.equal(result.valid[0].late_fee, 50);
  assert.equal(result.valid[0].grace_days, 5);
  assert.equal(result.valid[0].party_phone, '(555) 555-0100');
});

test('account import reports bad values and revalidates edits against existing accounts', () => {
  const rows = parseCSV('property_name,property_address,account_type,account_name,start_date,party_email,party_phone\nOak House,10 Oak St,rental,Oak Rental,2026-01-01,,555-0100\nOak House,10 Oak St,rental,New Lease,not-a-date,invalid-email,');
  const first = validateAccountRows(rows, properties, accounts, '2026-10-03');
  assert.deepEqual(first.errors.map(error => error.row), [2, 3]);

  rows[0].account_name = 'New Rental';
  rows[1].start_date = '2026-01-15';
  rows[1].party_email = 'tenant@example.com';
  const corrected = validateAccountRows(rows, properties, accounts, '2026-10-03');
  assert.equal(corrected.errors.length, 0);
  assert.deepEqual(corrected.valid.map(row => row._source_row), [2, 3]);
  assert.equal(corrected.valid[1].party_email, 'tenant@example.com');
  assert.equal(corrected.valid[0].party_phone, '555-0100');
});

test('expense import matches property/account, combines source notes, and skips possible duplicates', () => {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'templates', 'expenses-template.csv'), 'utf8'));
  const templateProperties = [{ id: 'tp1', name: 'Maple Street Home', address: '123 Maple Street' }];
  const templateAccounts = [{ id: 'tr1', property_id: 'tp1', name: 'Maple Street Rental', account_type: 'rental' }];
  const existing = [{ property_id: 'tp1', account_id: 'tr1', expense_date: '2026-10-03', amount: '125.00', payee: 'ABC Plumbing', memo: 'Kitchen faucet repair · Receipt 1024' }];
  const result = validateExpenseRows(rows, templateProperties, templateAccounts, existing);

  assert.equal(result.errors.length, 0);
  assert.equal(result.valid[0]._possible_duplicate, true);
  assert.deepEqual(selectImportRows(result.valid), []);
  assert.deepEqual([result.valid[0].property_name, result.valid[0].account_name, result.valid[0].category], ['Maple Street Home', 'Maple Street Rental', 'repairs']);
  assert.equal(result.valid[0].memo, 'Kitchen faucet repair · Receipt 1024');
});

test('expense import reports property, date, category, and positive-amount errors', () => {
  const rows = parseCSV('property_name,property_address,expense_date,amount,category\nMissing,1 Unknown,2026-02-28,12,repairs\nOak House,10 Oak St,2026-02-30,0,bogus');
  const result = validateExpenseRows(rows, properties, accounts, []);

  assert.deepEqual(result.valid, []);
  assert.deepEqual(result.errors.map(error => error.row), [2, 3]);
  assert.match(result.errors[0].message, /Property not found/);
  assert.match(result.errors[1].message, /zero or greater|greater than zero|Invalid expense date|Invalid expense category/);
});

test('security deposit refund imports require and match a rental account', () => {
  const rows=parseCSV('property_name,property_address,account_name,expense_date,amount,category,memo\nMaple Street Home,123 Maple Street,Maple Street Rental,2026-10-02,250,deposit_refund,Deposit returned');
  const property=[{id:'tp1',name:'Maple Street Home',address:'123 Maple Street'}];
  const rental=[{id:'tr1',property_id:'tp1',name:'Maple Street Rental',account_type:'rental'}];
  const note=[{id:'tn1',property_id:'tp1',name:'Maple Street Rental',account_type:'note'}];
  assert.equal(validateExpenseRows(rows,property,rental,[]).valid[0].category,'deposit_refund');
  assert.match(validateExpenseRows(rows,property,note,[]).errors[0].message,/rental account/);
  const withoutAccount=parseCSV('property_name,property_address,expense_date,amount,category\nMaple Street Home,123 Maple Street,2026-10-02,250,deposit_refund');
  assert.match(validateExpenseRows(withoutAccount,property,rental,[]).errors[0].message,/rental account/);
});

test('payment import enforces loan allocation totals and excludes duplicate receipts by default', () => {
  const rows = parseCSV('property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,unapplied_amount,memo\nOak House,10 Oak St,Oak Contract,2026-10-01,200,150,50,0,0,October\nOak House,10 Oak St,Oak Contract,2026-10-01,200,150,50,0,0,October\nOak House,10 Oak St,Oak Contract,2026-10-02,100,90,0,0,0,Wrong total');
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 4);
  assert.equal(result.valid[0]._possible_duplicate, false);
  assert.equal(result.valid[1]._possible_duplicate, true);
  assert.deepEqual(selectImportRows(result.valid).map(row => row.amount), [200]);
  assert.equal(result.valid[0].principal_amount, 150);
  assert.equal(result.valid[0].interest_amount, 50);
});

test('simple loan payment imports do not need principal and interest columns', () => {
  const rows = parseCSV('property_name,property_address,account_name,received_date,amount,payment_method,memo\nOak House,10 Oak St,Oak Contract,2026-10-01,750,check,October installment');
  const result = validatePaymentRows(rows, properties, accounts, []);
  assert.equal(result.errors.length, 0);
  assert.equal(result.valid[0].amount, 750);
  assert.equal(result.valid[0].principal_amount, 0);
  assert.equal(result.valid[0].interest_amount, 0);
  assert.equal(result.valid[0].unapplied_amount, 750);
});

test('payment import counts escrow separately from interest and principal', () => {
  const rows = parseCSV('property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,escrow_amount,unapplied_amount\nOak House,10 Oak St,Oak Contract,2026-10-01,750,24.39,575.61,0,150,0');
  const result = validatePaymentRows(rows, properties, accounts, []);
  assert.equal(result.valid[0].escrow_amount, 150);
});

test('payment import validates account lookup and normalizes rental allocations to zero', () => {
  const rows = parseCSV('property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,unapplied_amount\nOak House,10 Oak St,Oak Rental,2026-10-01,50,25,25,0,0\nOak House,10 Oak St,No Such Account,2026-10-01,50,0,0,0,0');
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].income_category, 'rent');
  assert.equal(result.valid[0].principal_amount, 0);
  assert.equal(result.valid[0].interest_amount, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /Account not found/);
});

test('payment template example maps to a clean rental receipt', () => {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'templates', 'payments-template.csv'), 'utf8'));
  const templateProperties = [{ id: 'tp1', name: 'Maple Street Home', address: '123 Maple Street' }];
  const templateAccounts = [{ id: 'tr1', property_id: 'tp1', name: 'Maple Street Rental', account_type: 'rental' }];
  const result = validatePaymentRows(rows, templateProperties, templateAccounts, []);

  assert.equal(result.errors.length, 0);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].amount, 1500);
  assert.equal(result.valid[0].income_category, 'rent');
  assert.equal(result.valid[0].memo, 'October rent');
});

test('payment import rejects rental and financing categories on the wrong account type', () => {
  const rows = parseCSV('property_name,property_address,account_name,received_date,amount,income_category,principal_amount,interest_amount,fee_amount,unapplied_amount\nOak House,10 Oak St,Oak Rental,2026-10-01,50,installment,0,0,0,0\nOak House,10 Oak St,Oak Contract,2026-10-01,50,rent,50,0,0,0');
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.deepEqual(result.valid, []);
  assert.deepEqual(result.errors.map(error => error.row), [2, 3]);
  assert.match(result.errors[0].message, /rental/);
  assert.match(result.errors[1].message, /land_contract/);
});
