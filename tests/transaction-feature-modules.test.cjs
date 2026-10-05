const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionModules() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-list-model.js",
    "transaction-row-view.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return context;
}

test("transaction list model scopes filters, resolves associations, and totals posted cash flow", () => {
  const context = loadTransactionModules();
  const state = {
    accounts: [
      {
        id: "rental",
        property_id: "home",
        account_type: "rental",
        name: "Main rental",
        party_name: "Tenant A",
      },
      {
        id: "note",
        property_id: "other",
        account_type: "note",
        name: "Private note",
      },
    ],
    properties: [
      { id: "home", name: "Oak House" },
      { id: "other", name: "Pine House" },
    ],
    payments: [
      {
        id: "payment-1",
        account_id: "rental",
        amount: 500,
        received_date: "2026-10-05",
        income_category: "rent",
        payment_method: "bank_transfer",
        status: "posted",
        memo: "October rent",
      },
      {
        id: "payment-2",
        account_id: "rental",
        amount: 60,
        received_date: "2026-10-02",
        income_category: "rent",
        payment_method: "check",
        status: "voided",
        void_reason: "Duplicate",
        memo: "Old receipt",
      },
      {
        id: "payment-3",
        account_id: "note",
        amount: 300,
        received_date: "2026-09-30",
        income_category: "installment",
        payment_method: "check",
        status: "posted",
        memo: "September",
      },
    ],
    expenses: [
      {
        id: "expense-1",
        property_id: "home",
        amount: 75,
        expense_date: "2026-10-03",
        category: "repair",
        payee: "Plumber",
        payment_method: "check",
        status: "posted",
        memo: "Leak",
      },
      {
        id: "expense-2",
        property_id: "home",
        amount: 125,
        expense_date: "2026-10-04",
        category: "insurance",
        payee: "Insurer",
        payment_method: "card",
        status: "posted",
        correction_of_expense_id: "expense-original",
      },
    ],
  };
  const model = context.window.PropertyDeskTransactionListModel.create({
    state,
    dateOnly: (value) => (value ? new Date(`${value}T12:00:00`) : null),
    expenseCategoryLabel: (value) => value,
    isPosted: (record) => record.status === "posted",
    monthStart: () => "2026-10-01",
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
  });

  const result = model.buildTransactionList({
    period: "month",
    query: "",
    type: "all",
    now: new Date("2026-10-05T12:00:00"),
  });

  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].item.id, "payment-1");
  assert.equal(result.rows[0].propertyName, "Oak House");
  assert.equal(result.rows[0].partyName, "Tenant A");
  assert.equal(result.rows[0].paymentMethod, "bank transfer");
  assert.equal(result.rows[1].item.id, "expense-2");
  assert.equal(result.rows[1].correctionOf, "expense-original");
  assert.equal(result.rows[2].item.id, "expense-1");
  assert.equal(result.rows[3].item.id, "payment-2");
  assert.equal(result.totals.collected, 500);
  assert.equal(result.totals.expenses, 200);
  assert.equal(result.totals.netCashFlow, 300);

  const searchResult = model.buildTransactionList({
    period: "all",
    query: "plumber",
    type: "expense",
    now: new Date("2026-10-05T12:00:00"),
  });
  assert.equal(searchResult.rows.length, 1);
  assert.equal(searchResult.rows[0].item.id, "expense-1");
});

test("transaction row view escapes displayed values and preserves void and correction markers", () => {
  const context = loadTransactionModules();
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const view = context.window.PropertyDeskTransactionRowView.create({
    esc,
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value,
  });
  const ordinary = view.transactionRowHTML({
    item: {
      id: "replacement",
      status: "posted",
      memo: "<corrected>",
      void_reason: "",
      payment_method: "check",
    },
    kind: "expense",
    date: "2026-10-01",
    amount: 40,
    propertyName: "<Oak>",
    partyName: "Repair crew",
    transactionType: "Expense",
    detailsType: "Repair",
    paymentMethod: "Crew",
    correctionOf: "old-expense",
  });
  assert.match(ordinary, /&lt;Oak&gt;/);
  assert.match(ordinary, /&lt;corrected&gt;/);
  assert.match(ordinary, /−\$40\.00/);
  assert.match(ordinary, /Corrected replacement/);
  assert.doesNotMatch(ordinary, /<corrected>/);

  const voided = view.transactionRowHTML({
    item: { id: "old", status: "voided", memo: "", void_reason: "Duplicate" },
    kind: "income",
    date: "2026-09-30",
    amount: 50,
    propertyName: "Home",
    partyName: "Tenant",
    transactionType: "Income",
    detailsType: "Rent",
    paymentMethod: "cash",
    correctionOf: "",
  });
  assert.match(voided, /transaction-voided/);
  assert.match(voided, /Voided/);
  assert.doesNotMatch(voided, /data-correct-transaction/);
  assert.doesNotMatch(voided, /data-void-transaction/);
});
