/* Pure CSV and field validation helpers shared by the app and its Node tests. */
(() => {
  'use strict';

  function moneyInput(value) {
    const raw = String(value ?? '').trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, '');
    const amount = Number(normalized) * (negative ? -1 : 1);
    return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
  }

  function csvMoney(value, label, { optional = false, minimum = 0 } = {}) {
    const raw = String(value ?? '').trim();
    const number = '(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?';
    const wrapped = new RegExp(`^\\(\\s*\\$?\\s*${number}\\s*\\)$`).test(raw);
    const plain = new RegExp(`^\\$?\\s*${number}$`).test(raw);
    if (!raw && optional) return 0;
    if (!wrapped && !plain) throw new Error(`Invalid amount “${raw}” for ${label}.`);
    const amount = moneyInput(raw);
    if (amount < minimum) throw new Error(`Amount for ${label} must be ${minimum === 0 ? 'zero or greater' : 'greater than zero'}.`);
    return amount;
  }

  function validIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false, afterQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i], next = text[i + 1];
      if (quoted) {
        if (char === '"' && next === '"') { field += '"'; i++; }
        else if (char === '"') { quoted = false; afterQuote = true; }
        else field += char;
      } else if (afterQuote && char !== ',' && char !== '\n' && char !== '\r') {
        throw new Error('CSV has unexpected characters after a quoted field.');
      } else if (char === '"') {
        if (field.length) throw new Error('CSV has a quote inside an unquoted field.');
        quoted = true;
      } else if (char === ',') {
        row.push(field); field = ''; afterQuote = false;
      } else if (char === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; afterQuote = false;
      } else if (char !== '\r') field += char;
    }
    if (quoted) throw new Error('CSV has an unclosed quoted field.');
    if (field || row.length) { row.push(field); rows.push(row); }

    const headers = (rows.shift() || []).map(value => value.trim());
    if (headers.length) headers[0] = headers[0].replace(/^\uFEFF/, '');
    if (headers.some(value => !value)) throw new Error('CSV has an empty column heading.');
    if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate column headings.');
    return rows.filter(values => values.some(value => value.trim())).map((values, index) => {
      if (values.length > headers.length) throw new Error(`CSV row ${index + 2} contains more values than there are column headings.`);
      return Object.fromEntries(headers.map((header, column) => [header, (values[column] || '').trim()]));
    });
  }

  const helpers = Object.freeze({ csvMoney, parseCSV, validIsoDate });
  globalThis.PropertyDeskImportUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
