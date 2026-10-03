const test = require('node:test');
const assert = require('node:assert/strict');
const { isPosted, principalBalance, sumPosted } = require('../ledger-utils.js');

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
