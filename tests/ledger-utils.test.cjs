const test = require('node:test');
const assert = require('node:assert/strict');
const { amortizationSchedule, isPosted, monthlyScheduledEstimate, principalBalance, sumPosted } = require('../ledger-utils.js');

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
