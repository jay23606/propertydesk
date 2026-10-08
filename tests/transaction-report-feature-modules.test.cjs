const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property and transaction views own their search and filter bindings", () => {
  for (const [file, globalName, expected] of [
    [
      "property-views.js",
      "PropertyDeskPropertyViews",
      [
        "property-search:input",
        "property-filter:change",
        "property-holder-filter:change",
        "show-archived:change",
      ],
    ],
    [
      "transaction-views.js",
      "PropertyDeskTransactionViews",
      [
        "payment-search:input",
        "payment-period:change",
        "transaction-type:change",
      ],
    ],
  ]) {
    const context = vm.createContext({ window: {} });
    if (file === "transaction-views.js") {
      for (const dependency of [
        "transaction-list-filter-model.js",
        "transaction-display-row-model.js",
        "transaction-association-model.js",
        "transaction-list-model.js",
        "transaction-summary-model.js",
        "transaction-row-view.js",
      ]) {
        vm.runInContext(
          fs.readFileSync(
            path.join(__dirname, "..", "features", dependency),
            "utf8",
          ),
          context,
        );
      }
    }
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", file), "utf8"),
      context,
    );
    const handlers = new Map();
    const feature = context.window[globalName].create({
      $: (id) => ({
        addEventListener: (event, handler) =>
          handlers.set(`${id}:${event}`, handler),
      }),
      documentRef: { addEventListener() {} },
      correctTransaction() {},
      voidTransaction() {},
    });

    const attachFilters =
      file === "transaction-views.js"
        ? feature.attachTransactionFilterEvents
        : feature.attachEvents;
    assert.equal(typeof attachFilters, "function");
    attachFilters();
    assert.deepEqual([...handlers.keys()], expected);
    assert.ok(
      [...handlers.values()].every((handler) => typeof handler === "function"),
    );
  }
});

test("transaction view renders filtered rows and independent month totals", () => {
  const context = vm.createContext({ window: {} });
  for (const dependency of [
    "transaction-list-filter-model.js",
    "transaction-display-row-model.js",
    "transaction-association-model.js",
    "transaction-list-model.js",
    "transaction-summary-model.js",
    "transaction-row-view.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", dependency),
        "utf8",
      ),
      context,
    );
  }
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-views.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { value: "", textContent: "", innerHTML: "" });
    }
    return elements.get(id);
  };
  $("payment-period").value = "all";
  $("payment-search").value = "";
  $("transaction-type").value = "all";
  $("payments-empty").classList = { toggle() {} };
  const state = {
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        account_type: "rental",
        name: "Unit A",
        party_name: "Tenant A",
      },
    ],
    properties: [{ id: "property-1", name: "Oak House" }],
    payments: [
      {
        id: "payment-1",
        account_id: "account-1",
        amount: 500,
        received_date: "2026-10-05",
        income_category: "rent",
        payment_method: "check",
        status: "posted",
      },
    ],
    expenses: [],
  };
  const feature = context.window.PropertyDeskTransactionViews.create({
    $,
    state,
    dateOnly: (value) => (value ? new Date(`${value}T12:00:00`) : null),
    fmtDate: (value) => value,
    esc: String,
    expenseCategoryLabel: (value) => value,
    money: (value) => `$${Number(value).toFixed(2)}`,
    postedOnOrAfter: (rows, field, start) =>
      rows.filter(
        (row) => row.status === "posted" && String(row[field]) >= start,
      ),
    monthStart: () => "2026-10-01",
    sumIncome: (rows) => rows.reduce((sum, row) => sum + Number(row.amount), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((sum, row) => sum + Number(row.amount), 0),
  });

  feature.renderPayments();

  assert.match($("payments-table").innerHTML, /Oak House/);
  assert.equal($("payments-collected").textContent, "$500.00");
  assert.equal($("expenses-total").textContent, "$0.00");
  assert.equal($("net-cash-flow").textContent, "$500.00");
});

test("transaction maintenance router loads after its view and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/transaction-views.js") <
      html.indexOf("features/transaction-maintenance-events.js") &&
      html.indexOf("features/transaction-maintenance-events.js") <
        html.indexOf("app.js"),
    "transaction view should load before its maintenance router and the app",
  );
  assert.match(worker, /'\.\/features\/transaction-maintenance-events\.js'/);
});

test("transaction maintenance router routes correction and void actions", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-maintenance-events.js",
      ),
      "utf8",
    ),
    context,
  );
  const calls = [];
  let clickHandler;
  const feature =
    context.window.PropertyDeskTransactionMaintenanceEvents.create({
      documentRef: {
        addEventListener(name, handler) {
          if (name === "click") clickHandler = handler;
        },
      },
      correctTransaction: (...args) => calls.push(["correct", ...args]),
      voidTransaction: (...args) => calls.push(["void", ...args]),
    });
  feature.attachTransactionActionEvents();

  for (const [selector, dataset] of [
    ["[data-correct-transaction]", { kind: "income", id: "payment-1" }],
    ["[data-void-transaction]", { kind: "expense", id: "expense-1" }],
  ]) {
    clickHandler({
      target: { closest: (value) => (value === selector ? { dataset } : null) },
    });
  }

  assert.deepEqual(calls, [
    ["correct", "income", "payment-1"],
    ["void", "expense", "expense-1"],
  ]);
});

test("report views summarize the current-year ledger and escape import history", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["report-model.js", "report-views.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const year = new Date().getFullYear();
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: "", innerHTML: "" });
    return elements.get(id);
  };
  const esc = (value) =>
    String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const state = {
    payments: [
      {
        amount: 600,
        received_date: `${year}-02-01`,
        income_category: "rent",
        status: "posted",
      },
      {
        amount: 900,
        received_date: `${year}-03-01`,
        income_category: "deposit",
        status: "posted",
      },
      {
        amount: 75,
        received_date: `${year}-04-01`,
        income_category: "rent",
        status: "voided",
      },
      {
        amount: 200,
        received_date: `${year - 1}-12-01`,
        income_category: "rent",
        status: "posted",
      },
    ],
    expenses: [
      {
        amount: 100,
        expense_date: `${year}-02-02`,
        category: "repair",
        status: "posted",
      },
      {
        amount: 50,
        expense_date: `${year}-03-02`,
        category: "deposit_refund",
        status: "posted",
      },
      {
        amount: 20,
        expense_date: `${year}-04-02`,
        category: "repair",
        status: "voided",
      },
    ],
    accounts: [
      { id: "rental", account_type: "rental" },
      { id: "note", account_type: "note" },
      { id: "contract", account_type: "land_contract" },
    ],
    importBatches: [
      {
        source_name: "<import>.csv",
        source_type: "accounts",
        created_at: `${year}-02-01T12:00:00Z`,
        rows_accepted: 2,
        rows_total: 3,
        status: "completed",
      },
    ],
  };
  const dateOnly = (date) => (date ? new Date(`${date}T12:00:00`) : null);
  const accountBalance = (account) =>
    account.id === "rental" ? 0 : account.id === "note" ? 1200 : 800;
  const reportModel = context.window.PropertyDeskReportModel.create({
    state,
    dateOnly,
    sumIncome: (rows) =>
      rows.reduce(
        (total, payment) =>
          payment.status === "posted" && payment.income_category !== "deposit"
            ? total + Number(payment.amount || 0)
            : total,
        0,
      ),
    sumOperatingExpenses: (rows) =>
      rows.reduce(
        (total, expense) =>
          expense.status === "posted" && expense.category !== "deposit_refund"
            ? total + Number(expense.amount || 0)
            : total,
        0,
      ),
    accountBalance,
  });
  const feature = context.window.PropertyDeskReportViews.create({
    $,
    esc,
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    buildReportModel: reportModel.buildReportModel,
  });

  const model = reportModel.buildReportModel(year);
  feature.renderReports();

  assert.equal(model.income, 600);
  assert.equal(model.costs, 100);
  assert.equal(model.principal, 2000);
  assert.deepEqual(JSON.parse(JSON.stringify(model.accountCounts)), {
    rental: 1,
    land_contract: 1,
    note: 1,
  });
  assert.equal($("report-ytd").textContent, "$600.00");
  assert.equal($("report-expenses-ytd").textContent, "$100.00");
  assert.equal($("report-net-ytd").textContent, "$500.00");
  assert.equal($("report-principal").textContent, "$2000.00");
  assert.match(
    $("account-breakdown").innerHTML,
    />Rentals<\/span>[\s\S]*?\>1<\/strong>/,
  );
  assert.match($("account-breakdown").innerHTML, /Land contracts/);
  assert.match($("account-breakdown").innerHTML, /Private notes/);
  assert.match($("import-history").innerHTML, /&lt;import&gt;\.csv/);
  assert.match($("import-history").innerHTML, /2 of 3/);
});
