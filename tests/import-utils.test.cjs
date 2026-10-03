const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { csvMoney, markPossibleDuplicates, parseCSV, selectImportRows, validIsoDate } = require('../import-utils.js');

test('all provided CSV templates parse with their example row', () => {
  for (const filename of ['accounts-template.csv', 'payments-template.csv', 'expenses-template.csv']) {
    const csv = fs.readFileSync(path.join(__dirname, '..', 'templates', filename), 'utf8');
    assert.equal(parseCSV(csv).length, 1, filename);
  }
});

test('CSV parser handles BOM, CRLF, quoted commas, doubled quotes, and quoted newlines', () => {
  const rows = parseCSV('\uFEFFname,amount,memo\r\n"Oak, LLC",12.50,"paid ""in full"""\r\n"Unit 2",5,"line one\nline two"');
  assert.deepEqual(rows, [
    { name: 'Oak, LLC', amount: '12.50', memo: 'paid "in full"' },
    { name: 'Unit 2', amount: '5', memo: 'line one\nline two' },
  ]);
});

test('CSV parser rejects duplicate or empty headings and malformed quoting/row widths', () => {
  assert.throws(() => parseCSV('a,a\n1,2'), /duplicate column/i);
  assert.throws(() => parseCSV('a,,c\n1,2,3'), /empty column/i);
  assert.throws(() => parseCSV('a,b\n1,"unfinished'), /unclosed quoted/i);
  assert.throws(() => parseCSV('a,b\n1,2,3'), /more values/i);
  assert.throws(() => parseCSV('a,b\n1,"closed"x'), /unexpected characters/i);
  assert.throws(() => parseCSV('a,b\n1,un"closed'), /quote inside/i);
});

test('CSV money accepts valid currency and rejects malformed, negative, or too-precise values', () => {
  assert.equal(csvMoney('$1,200.00', 'amount'), 1200);
  assert.equal(csvMoney('(5.25)', 'amount', { minimum: -10 }), -5.25);
  assert.equal(csvMoney('', 'optional amount', { optional: true }), 0);
  for (const value of ['12xyz', '-12', '$1,20.00', '1.234']) {
    assert.throws(() => csvMoney(value, 'amount'), /Invalid amount/i, value);
  }
  assert.throws(() => csvMoney('0', 'payment', { minimum: 0.01 }), /greater than zero/i);
});

test('date validator accepts real ISO dates and rejects impossible dates', () => {
  assert.equal(validIsoDate('2024-02-29'), true);
  assert.equal(validIsoDate('2025-02-29'), false);
  assert.equal(validIsoDate('10/01/2025'), false);
  assert.equal(validIsoDate('2025-13-01'), false);
});

test('re-imported and repeated rows are flagged and excluded unless explicitly included', () => {
  const key = row => `${row.account}|${row.date}|${row.amount}|${row.memo}`;
  const rows = [
    { account: 'a1', date: '2025-01-01', amount: '100.00', memo: 'January' },
    { account: 'a1', date: '2025-02-01', amount: '100.00', memo: 'February' },
    { account: 'a1', date: '2025-02-01', amount: '100.00', memo: 'February' },
  ];
  const flagged = markPossibleDuplicates(rows, [key(rows[0])], key);

  assert.deepEqual(flagged.map(row => row._possible_duplicate), [true, false, true]);
  assert.deepEqual(selectImportRows(flagged).map(row => row.memo), ['February']);
  assert.equal(selectImportRows(flagged, true).length, 3);
});
