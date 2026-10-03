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

test('voided expenses no longer count toward posted expenses', () => {
  assert.equal(sumPosted([
    { amount: '75.00', status: 'posted' },
    { amount: '25.00', status: 'voided' },
  ]), 75);
});
