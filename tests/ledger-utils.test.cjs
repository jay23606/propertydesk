const test = require('node:test');
const assert = require('node:assert/strict');
const { amountDueSince, amortizationSchedule, createBackup, isPosted, monthlyScheduledEstimate, principalBalance, scheduledLoanBalance, securityDepositBalance, sumIncome, sumOperatingExpenses, sumPosted, unpaidDueAccrualStart } = require('../ledger-utils.js');

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

test('security deposit refunds are excluded from operating expense totals', () => {
  assert.equal(sumOperatingExpenses([
    { amount: 100, category: 'repairs' },
    { amount: 200, category: 'deposit_refund' },
    { amount: 50, category: 'insurance', status: 'voided' },
  ]), 100);
});

test('security deposit held balance reconciles posted receipts, refunds, retention, and reversals', () => {
  const entries=[
    { id:'r1', entry_type:'received', amount:1000, source_payment_id:'p1' },
    { id:'r2', entry_type:'received', amount:200, source_payment_id:'p2' },
    { id:'f1', entry_type:'refunded', amount:250, source_expense_id:'e1' },
    { id:'t1', entry_type:'retained', amount:100 },
    { id:'t2', entry_type:'restored', amount:25 },
  ];
  const result=securityDepositBalance(entries,[
    { id:'p1', status:'posted' }, { id:'p2', status:'voided' }
  ],[{ id:'e1', status:'posted' }]);
  assert.deepEqual(result.totals,{received:1000,refunded:250,retained:100,restored:25,held:675});
  assert.deepEqual(result.active.map(entry=>entry.id),['r1','f1','t1','t2']);
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

test('running amount due includes the whole current month and a recorded payment reduces it dollar-for-dollar', () => {
  const account = { id: 'rolling', start_date: '2025-12-15', next_due_date: '2026-01-15', payment_amount: 100, payment_frequency: 'monthly' };
  const payments = [{ account_id: 'rolling', amount: 60, received_date: '2026-01-20', income_category: 'installment' }];
  assert.equal(amountDueSince([account], payments, '2026-01-01', '2026-02-14'), 140, 'the February installment is assumed unpaid before its due day');
  assert.equal(amountDueSince([account], payments, '2026-01-01', '2026-02-15'), 140, 'the next month adds another scheduled installment');
  assert.equal(amountDueSince([account], [...payments, { account_id: 'rolling', amount: 100, received_date: '2026-02-15', income_category: 'installment' }], '2026-01-01', '2026-02-28'), 40, 'recording the next payment subtracts from the carry-forward amount');
});

test('current month is assumed unpaid and the carry-forward grows each month without a payment', () => {
  const account = { id: 'october', start_date: '2025-12-15', next_due_date: '2026-10-15', payment_amount: 100, payment_frequency: 'monthly' };
  const janThroughSep = Array.from({ length: 9 }, (_, index) => ({
    account_id: 'october', amount: 100, received_date: `2026-${String(index + 1).padStart(2, '0')}-15`, income_category: 'installment'
  }));
  assert.equal(amountDueSince([account], janThroughSep, '2026-01-01', '2026-10-03'), 100, 'October is included before the October 15 due day');
  assert.equal(amountDueSince([account], janThroughSep, '2026-01-01', '2026-11-03'), 200, 'a missed October amount carries forward with November');
  assert.equal(amountDueSince([account], [...janThroughSep, { account_id: 'october', amount: 100, received_date: '2026-10-15', income_category: 'installment' }], '2026-01-01', '2026-11-03'), 100, 'a recorded October payment subtracts from the running total');
});

test('unpaid due starts in October 2026 across account types, ignores unrecorded earlier months, then carries forward', () => {
  const account = { id: 'contract-october', account_type: 'land_contract', start_date: '2020-04-01', next_due_date: '2026-10-15', payment_amount: 550, payment_frequency: 'monthly' };
  const priorReceipts = Array.from({ length: 9 }, (_, index) => ({
    account_id: account.id, amount: 550, received_date: `2026-${String(index + 1).padStart(2, '0')}-15`, income_category: 'installment'
  }));
  const trackingStart = unpaidDueAccrualStart(account);
  assert.equal(trackingStart, '2026-10-01');
  assert.equal(amountDueSince([account], priorReceipts, trackingStart, '2026-10-03'), 550, 'only October is assumed unpaid at launch');
  assert.equal(amountDueSince([account], priorReceipts, trackingStart, '2026-11-03'), 1100, 'an unpaid October installment carries into November');
  assert.equal(amountDueSince([account], [...priorReceipts, { account_id: account.id, amount: 550, received_date: '2026-10-15', income_category: 'installment' }], trackingStart, '2026-11-03'), 550, 'recording October payment reduces the carry-forward');
  const rental = { ...account, id: 'rental-october', account_type: 'rental' };
  const rentalReceipts = priorReceipts.map(payment => ({ ...payment, account_id: rental.id, income_category: 'rent' }));
  assert.equal(unpaidDueAccrualStart(rental), '2026-10-01');
  assert.equal(amountDueSince([rental], rentalReceipts, unpaidDueAccrualStart(rental), '2026-10-03'), 550, 'rentals also start at October because earlier receipts are not fully recorded');
  assert.equal(amountDueSince([rental], rentalReceipts, unpaidDueAccrualStart(rental), '2026-11-03'), 1100, 'missed rent then carries forward in later months');
});

test('monthly due dates stay anchored at month end', () => {
  assert.equal(amountDueSince([
    { id: 'month-end', start_date: '2026-01-31', next_due_date: '2026-01-31', payment_amount: 100, payment_frequency: 'monthly' }
  ], [], '2026-01-01', '2026-03-31'), 300);
});

test('unpaid charges backfill from the current next-due date through the 2026 accrual window', () => {
  const account = { id: 'advanced-due', start_date: '2020-01-15', next_due_date: '2026-10-15', payment_amount: 100, payment_frequency: 'monthly' };
  assert.equal(amountDueSince([account], [], '2026-01-01', '2026-10-03'), 1000);
  assert.equal(amountDueSince([{ ...account, next_due_date: '2026-11-15' }], [], '2026-01-01', '2026-10-03'), 1000);
  assert.equal(amountDueSince([{ ...account, start_date: '2026-05-15' }], [], '2026-01-01', '2026-10-03'), 600);
});

test('future next-due dates retain the month-end anchor when backfilling prior installments', () => {
  assert.equal(amountDueSince([
    { id: 'advanced-month-end', start_date: '2020-01-31', next_due_date: '2026-10-31', payment_amount: 80, payment_frequency: 'monthly' }
  ], [], '2026-01-01', '2026-03-31'), 240);
});

test('scheduled loan balance follows amortization and accepts positive or negative owner adjustments', () => {
  const account = { account_type: 'land_contract', original_principal: 1000, interest_rate: 0, term_months: 4, start_date: '2025-12-01' };
  assert.equal(scheduledLoanBalance(account, '2026-02-01'), 500);
  assert.equal(scheduledLoanBalance({ ...account, balance_adjustment: 125 }, '2026-02-01'), 625);
  assert.equal(scheduledLoanBalance({ ...account, balance_adjustment: -125 }, '2026-02-01'), 375);
});

test('on-time land-contract schedule provides the hypothetical balance independently of payments received', () => {
  const account = {
    id: 'amended-note', account_type: 'land_contract', start_date: '2025-05-01',
    original_principal: 49000, interest_rate: 9.0864, term_months: 348,
    principal_interest_amount: 400, payment_amount: 550, payment_frequency: 'monthly'
  };
  const schedule = amortizationSchedule(account.original_principal, account.interest_rate,
    account.term_months, account.start_date, account.principal_interest_amount);
  assert.equal(schedule[0].date, '2025-06-01');
  assert.equal(schedule[0].payment, 400);
  const hypothetical = scheduledLoanBalance(account, '2026-10-03');
  assert.equal(hypothetical, 48476.48);
  assert.equal(scheduledLoanBalance({ ...account, balance_adjustment: -250 }, '2026-10-03'), 48226.48);
  const received = [{ account_id: account.id, amount: 1000, received_date: '2026-04-01', income_category: 'installment' }];
  assert.equal(amountDueSince([account], [], '2026-01-01', '2026-10-03'), 5500);
  assert.equal(amountDueSince([account], received, '2026-01-01', '2026-10-03'), 4500);
  assert.equal(scheduledLoanBalance(account, '2026-10-03'), hypothetical,
    'recording money received changes Unpaid Due, not the on-time balance estimate');
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
  }, '2026-10-03T12:00:00.000Z', [{ path: 'agreements/p1/d1-lease.pdf', file_name: 'lease.pdf', content_type: 'application/pdf', file_size: 42, property_id: 'p1', account_id: 'a1' }]);
  assert.equal(backup.manifest.format, 'propertydesk-backup');
  assert.equal(backup.manifest.format_version, 6);
  assert.equal(backup.manifest.schema_version, 6);
  assert.equal(backup.manifest.exported_at, '2026-10-03T12:00:00.000Z');
  assert.equal(backup.manifest.restore_supported, false);
  assert.equal(backup.manifest.file_count, 1);
  assert.deepEqual(backup.manifest.included_files[0], {
    path: 'agreements/p1/d1-lease.pdf', file_name: 'lease.pdf', content_type: 'application/pdf',
    file_size: 42, property_id: 'p1', account_id: 'a1'
  });
  assert.deepEqual(backup.manifest.record_counts, {
    pd_properties: 1, pd_accounts: 2, pd_agreement_versions: 1, pd_payments: 0,
    pd_expenses: 1, pd_deposit_entries: 0, pd_documents: 1, pd_import_batches: 1, pd_audit_events: 2,
    pd_workspace_members: 1, pd_property_holders: 1
  });
  assert.equal(backup.data.pd_audit_events.length, 2);
});

test('private ZIP helper writes readable stored entries and rejects unsafe paths', async () => {
  const { createZip, crc32 } = require('../zip-utils.js');
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const bytes = new Uint8Array(await createZip([
    { name: 'propertydesk-backup.json', data: '{"ok":true}' },
    { name: 'agreements/property-1/lease.pdf', data: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }
  ], new Date('2026-10-03T12:00:00Z')).arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(8, true), 0, 'entries are stored without a compression dependency');
  assert.ok(bytes.some((_, index) => index <= bytes.length - 4 && view.getUint32(index, true) === 0x06054b50), 'archive has a central-directory end record');
  assert.throws(() => createZip([{ name: '../private.txt', data: 'nope' }]), /relative paths/);
});
