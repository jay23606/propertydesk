const test = require('node:test');
const assert = require('node:assert/strict');
const { amountDueSince, amortizationSchedule, createBackup, isPosted, monthlyScheduledEstimate, principalBalance, scheduledLoanBalance, sumIncome, sumPosted } = require('../ledger-utils.js');

test('voided payments remain recorded but no longer affect collected income', () => {
  const payments = [
    { amount: '1000.00' },
    { amount: '250.00', status: 'posted' },
    { amount: '300.00', status: 'voided' },
  ];
  assert.equal(sumPosted(payments), 1250);
  assert.equal(isPosted(payments[0]), true, 'legacy rows without status remain posted');
  assert.equal(isPosted(payments[2]), false);
});

test('voided principal allocations do not reduce the account balance', () => {
  const payments = [
    { principal_amount: '120.00', status: 'posted' },
    { principal_amount: '80.00', status: 'voided' },
    { principal_amount: '30.00' },
  ];
  assert.equal(principalBalance('500.00', payments), 350);
  assert.equal(principalBalance(40, [{ principal_amount: 50 }]), 0);
});

test('ledger opening balance can differ from contract principal and ignores earlier payments', () => {
  const payments = [
    { principal_amount: 200, received_date: '2025-12-31' },
    { principal_amount: 125, received_date: '2026-01-01' },
    { principal_amount: 100, received_date: '2026-01-02' },
    { principal_amount: 25, received_date: '2026-02-01', status: 'voided' },
  ];
  assert.equal(principalBalance(1000, payments, 500, '2026-01-01'), 400);
  assert.equal(principalBalance(1000, payments, 0, '2026-01-01'), 0);
});

test('voided expenses no longer count toward posted expenses', () => {
  assert.equal(sumPosted([
    { amount: '75.00', status: 'posted' },
    { amount: '25.00', status: 'voided' },
  ]), 75);
});

test('security deposits remain cash receipts but are excluded from income totals', () => {
  const receipts = [
    { amount: 1000, income_category: 'rent' },
    { amount: 500, income_category: 'deposit' },
    { amount: 25, income_category: 'late_fee' },
    { amount: 200, income_category: 'deposit', status: 'voided' },
  ];
  assert.equal(sumPosted(receipts), 1525);
  assert.equal(sumIncome(receipts), 1025);
});

test('monthly scheduled totals normalize payment cadence and exclude inactive accounts', () => {
  assert.equal(monthlyScheduledEstimate([
    { payment_amount: 1200, payment_frequency: 'monthly' },
    { payment_amount: 300, payment_frequency: 'weekly' },
    { payment_amount: 500, payment_frequency: 'biweekly' },
    { payment_amount: 900, payment_frequency: 'quarterly' },
    { payment_amount: 1200, payment_frequency: 'annual' },
    { payment_amount: 1000, payment_frequency: 'monthly', status: 'paused' },
    { payment_amount: 700, payment_frequency: 'monthly', status: 'closed' },
  ]), 3983.33);
});

test('unpaid scheduled charges accumulate from 2026 and carry forward, crediting only posted non-deposit payments', () => {
  const accounts = [
    { id: 'a1', start_date: '2025-12-01', next_due_date: '2025-12-01', payment_amount: 500, payment_frequency: 'monthly' },
    { id: 'a2', start_date: '2026-01-01', next_due_date: '2026-01-01', payment_amount: 250, payment_frequency: 'monthly' },
  ];
  const payments = [
    { account_id: 'a1', amount: 500, received_date: '2026-01-02', income_category: 'installment' },
    { account_id: 'a1', amount: 500, received_date: '2026-02-02', income_category: 'installment', status: 'voided' },
    { account_id: 'a1', amount: 500, received_date: '2026-03-01', income_category: 'deposit' },
    { account_id: 'a2', amount: 250, received_date: '2026-01-03', income_category: 'rent' },
  ];
  assert.equal(amountDueSince(accounts, payments, '2026-01-01', '2026-03-31'), 1500);
});

test('monthly due dates stay anchored at month end', () => {
  assert.equal(amountDueSince([
    { id: 'month-end', start_date: '2026-01-31', next_due_date: '2026-01-31', payment_amount: 100, payment_frequency: 'monthly' }
  ], [], '2026-01-01', '2026-03-31'), 300);
});

test('scheduled loan balance follows amortization and accepts positive or negative owner adjustments', () => {
  const account = { account_type: 'land_contract', original_principal: 1000, interest_rate: 0, term_months: 4, start_date: '2025-12-01' };
  assert.equal(scheduledLoanBalance(account, '2026-02-01'), 500);
  assert.equal(scheduledLoanBalance({ ...account, balance_adjustment: 125 }, '2026-02-01'), 625);
  assert.equal(scheduledLoanBalance({ ...account, balance_adjustment: -125 }, '2026-02-01'), 375);
});

test('amended land-contract terms produce the documented payment and 2026 estimates', () => {
  const account = {
    id: 'amended-note', account_type: 'land_contract', start_date: '2025-05-01',
    original_principal: 49000, interest_rate: 9.0864, term_months: 348,
    principal_interest_amount: 400, payment_amount: 550, payment_frequency: 'monthly'
  };
  const schedule = amortizationSchedule(account.original_principal, account.interest_rate,
    account.term_months, account.start_date, account.principal_interest_amount);
  assert.equal(schedule[0].date, '2025-06-01');
  assert.equal(schedule[0].payment, 400);
  assert.equal(scheduledLoanBalance(account, '2026-10-03'), 48476.48);
  assert.equal(amountDueSince([account], [], '2026-01-01', '2026-10-03'), 5500);
  assert.equal(amountDueSince([account], [{ account_id: account.id, amount: 1000,
    received_date: '2026-04-01', income_category: 'installment' }], '2026-01-01', '2026-10-03'), 4500);
});

test('amortization estimates derive P&I from terms when no contractual P&I amount is supplied', () => {
  const schedule = amortizationSchedule(1000, 12, 12, '2024-01-01');
  assert.equal(schedule.length, 12);
  assert.ok(schedule[0].payment > 0);
  assert.ok(schedule[0].interest > 0);
  assert.equal(schedule.at(-1).balance, 0);
});

test('contractual P&I can be estimated separately from escrow-inclusive installments', () => {
  const schedule = amortizationSchedule(1000, 0, 2, '2024-01-01', 600);
  assert.equal(schedule[0].payment, 600);
  assert.equal(schedule[0].balance, 400);
  assert.equal(schedule[1].payment, 400);
  assert.equal(schedule[1].balance, 0);
});

test('amortization due dates preserve month-end dates without overflowing', () => {
  const schedule = amortizationSchedule(1000, 0, 2, '2024-01-31');
  assert.deepEqual(schedule.map(row => row.date), ['2024-02-29', '2024-03-31']);
});

test('backup manifest identifies its version and counts every supported table', () => {
  const backup = createBackup({
    pd_properties: [{ id: 'p1' }],
    pd_accounts: [{ id: 'a1' }, { id: 'a2' }],
    pd_agreement_versions: [{ id: 'v1' }],
    pd_payments: [],
    pd_expenses: [{ id: 'e1' }],
    pd_documents: [{ id: 'd1' }],
    pd_import_batches: [{ id: 'b1' }],
    pd_audit_events: [{ id: 'h1' }, { id: 'h2' }],
    pd_workspace_members: [{ member_user_id: 'u1' }],
    pd_property_holders: [{ property_id: 'p1', member_user_id: 'u1' }]
  }, '2026-10-03T12:00:00.000Z');
  assert.equal(backup.manifest.format, 'propertydesk-backup');
  assert.equal(backup.manifest.format_version, 4);
  assert.equal(backup.manifest.schema_version, 4);
  assert.equal(backup.manifest.exported_at, '2026-10-03T12:00:00.000Z');
  assert.equal(backup.manifest.restore_supported, false);
  assert.deepEqual(backup.manifest.record_counts, {
    pd_properties: 1, pd_accounts: 2, pd_agreement_versions: 1, pd_payments: 0,
    pd_expenses: 1, pd_documents: 1, pd_import_batches: 1, pd_audit_events: 2,
    pd_workspace_members: 1, pd_property_holders: 1
  });
  assert.equal(backup.data.pd_audit_events.length, 2);
});
