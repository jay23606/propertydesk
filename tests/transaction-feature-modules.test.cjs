const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionModules() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-list-filter-model.js",
    "transaction-display-row-model.js",
    "transaction-association-model.js",
    "transaction-list-model.js",
    "transaction-summary-model.js",
    "transaction-row-view.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return context;
}

test("transaction association model joins rows and builds searchable text", () => {
  const context = loadTransactionModules();
  const state = {
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        name: "Primary account",
        party_name: "Tenant One",
      },
    ],
    properties: [
      { id: "property-1", name: "First Street" },
      { id: "property-2", name: "Second Street" },
    ],
  };
  const model = context.window.PropertyDeskTransactionAssociationModel.create({
    getAccounts: () => state.accounts,
    getProperties: () => state.properties,
  });
  const income = model.associateTransaction({
    kind: "income",
    date: "2026-10-01",
    amount: 700,
    item: { account_id: "account-1", memo: "October rent" },
  });
  const expense = model.associateTransaction({
    kind: "expense",
    date: "2026-10-02",
    amount: 80,
    item: {
      account_id: "account-1",
      property_id: "property-2",
      payee: "Roofing Co",
      memo: "Roof repair",
    },
  });

  assert.equal(income.account, state.accounts[0]);
  assert.equal(income.property, state.properties[0]);
  assert.equal(
    income.searchText,
    "primary account tenant one first street october rent ",
  );
  assert.equal(expense.account, state.accounts[0]);
  assert.equal(expense.property, state.properties[1]);
  assert.equal(
    expense.searchText,
    "primary account tenant one second street roof repair roofing co",
  );
});

test("transaction display projection omits loaded records and search data", () => {
  const context = loadTransactionModules();
  const model = context.window.PropertyDeskTransactionDisplayRowModel.create({
    expenseCategoryLabel: (value) => `Category: ${value}`,
  });
  const displayRow = model.toDisplayRow({
    kind: "expense",
    date: "2026-10-03",
    amount: 75,
    item: {
      id: "expense-1",
      user_id: "private-owner-id",
      account_id: "account-1",
      property_id: "property-1",
      category: "repair",
      payee: "Plumber",
      payment_method: "check",
      status: "posted",
      memo: "Leak repair",
      void_reason: null,
      correction_of_expense_id: null,
    },
    account: {
      id: "account-1",
      user_id: "private-owner-id",
      account_type: "rental",
      name: "Tenant account",
      party_name: "Tenant Name",
      property_id: "property-1",
    },
    property: {
      id: "property-1",
      user_id: "private-owner-id",
      name: "Rental home",
    },
    searchText: "tenant name rental home plumber leak repair",
  });

  assert.deepEqual(Object.keys(displayRow).sort(), [
    "amount",
    "correctionOf",
    "date",
    "detailsType",
    "item",
    "kind",
    "partyName",
    "paymentMethod",
    "propertyName",
    "transactionType",
  ]);
  assert.deepEqual(Object.keys(displayRow.item).sort(), [
    "id",
    "memo",
    "status",
    "void_reason",
  ]);
  assert.equal(displayRow.partyName, "Tenant Name");
  assert.equal(displayRow.propertyName, "Rental home");
  assert.equal(displayRow.paymentMethod, "Plumber");
  assert.equal(displayRow.detailsType, "Category: repair");
  assert.equal(Object.hasOwn(displayRow, "searchText"), false);
  assert.equal(Object.hasOwn(displayRow, "account"), false);
  assert.equal(Object.hasOwn(displayRow, "property"), false);
});

test("transaction list model filters rows and resolves their display associations", () => {
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
        user_id: "private-owner-id",
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
        id: "payment-4",
        account_id: "rental",
        amount: 40,
        received_date: "2026-10-01",
        income_category: "deposit",
        payment_method: "cash",
        status: "posted",
        memo: "Security deposit",
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
  const associationModel =
    context.window.PropertyDeskTransactionAssociationModel.create({
      getAccounts: () => state.accounts,
      getProperties: () => state.properties,
    });
  const displayRowModel =
    context.window.PropertyDeskTransactionDisplayRowModel.create({
      expenseCategoryLabel: (value) => value,
    });
  delete context.window.PropertyDeskTransactionAssociationModel;
  delete context.window.PropertyDeskTransactionDisplayRowModel;
  const model = context.window.PropertyDeskTransactionListModel.create({
    getPayments: () => state.payments,
    getExpenses: () => state.expenses,
    associationModel,
    displayRowModel,
    filterModel: context.window.PropertyDeskTransactionListFilterModel.create({
      dateOnly: (value) => (value ? new Date(`${value}T12:00:00`) : null),
    }),
  });
  const summary = context.window.PropertyDeskTransactionSummaryModel.create({
    getPayments: () => state.payments,
    getExpenses: () => state.expenses,
    postedOnOrAfter: (rows, field, start) =>
      rows.filter(
        (row) => row.status === "posted" && String(row[field]) >= start,
      ),
    monthStart: () => "2026-10-01",
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
  });

  const rows = model.buildTransactionList({
    period: "month",
    query: "",
    type: "all",
    now: new Date("2026-10-05T12:00:00"),
  });

  assert.equal(rows.length, 5);
  assert.equal(rows[0].item.id, "payment-1");
  assert.deepEqual(Object.keys(rows[0].item).sort(), [
    "id",
    "memo",
    "status",
    "void_reason",
  ]);
  assert.equal(Object.hasOwn(rows[0].item, "user_id"), false);
  assert.equal(Object.hasOwn(rows[0].item, "account_id"), false);
  assert.equal(rows[0].propertyName, "Oak House");
  assert.equal(rows[0].partyName, "Tenant A");
  assert.equal(rows[0].transactionType, "Income");
  assert.equal(rows[0].detailsType, "rent");
  assert.equal(rows[0].paymentMethod, "bank transfer");
  assert.equal(Object.hasOwn(rows[0], "searchText"), false);
  assert.equal(Object.hasOwn(rows[0], "account"), false);
  assert.equal(Object.hasOwn(rows[0], "property"), false);
  assert.equal(rows[1].item.id, "expense-2");
  assert.equal(rows[1].correctionOf, "expense-original");
  assert.equal(rows[2].item.id, "expense-1");
  assert.equal(rows[3].item.id, "payment-2");
  assert.equal(rows[4].item.id, "payment-4");
  assert.equal(rows[4].transactionType, "Security deposit");
  assert.equal(rows[4].detailsType, "deposit");
  assert.equal(rows[4].paymentMethod, "cash");

  const totals = summary.currentMonthTotals();
  assert.equal(totals.collected, 540);
  assert.equal(totals.expenses, 200);
  assert.equal(totals.netCashFlow, 340);

  const searchResult = model.buildTransactionList({
    period: "all",
    query: "plumber",
    type: "expense",
    now: new Date("2026-10-05T12:00:00"),
  });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].item.id, "expense-1");

  const yearIncome = model.buildTransactionList({
    period: "year",
    query: "",
    type: "income",
    now: new Date("2026-10-05T12:00:00"),
  });
  assert.deepEqual(
    Array.from(yearIncome, (row) => row.item.id),
    ["payment-1", "payment-2", "payment-4", "payment-3"],
  );
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
