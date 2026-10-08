const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app composes the Properties grid and action operations explicitly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features/property-portfolio-workflow.js"),
    "utf8",
  );
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const order = [
    "PropertyDeskPropertyPortfolioTable.create(",
    "PropertyDeskPropertyPortfolioReminderModel.create(",
    "PropertyDeskPropertyPortfolioAccountRowModel.create(",
    "PropertyDeskPropertyPortfolioFilterModel.create(",
    "PropertyDeskPropertyPortfolioModel.create(",
    "PropertyDeskPropertyViews.create(",
    "PropertyDeskPropertyQuickNote.create(",
    "PropertyDeskPropertyViewEvents.create(",
  ].map((marker) => workflow.indexOf(marker));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.match(
    app,
    /propertyRepository: repositories\.properties,[\s\S]*?openAccountForProperty,/,
  );
  assert.doesNotMatch(
    app,
    /(?:PropertyDeskPropertyPortfolio(?:Table|Model)|PropertyDeskProperty(?:QuickNote|ViewEvents))\.create\(/,
  );
  assert.match(app, /attachPropertyGridEvents,\s*attachPropertyActionEvents,/);
  const script = "features/property-portfolio-workflow.js";
  assert.ok(
    html.indexOf(script) < html.indexOf("app.js"),
    "Properties workflow loads before app.js",
  );
  assert.ok(
    worker.includes(`'./${script}'`),
    "Properties workflow is precached",
  );
});

test("Properties workflow returns explicit view and action operations", () => {
  const calls = [];
  const action = () => {};
  const editPropertyQuickNote = () => {};
  const propertyRepository = {};
  const state = {};
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyPortfolioTable: {
        create: () => {
          calls.push("table");
          return {};
        },
      },
      PropertyDeskPropertyPortfolioAccountRowModel: {
        create: () => {
          calls.push("account rows");
          return {};
        },
      },
      PropertyDeskPropertyPortfolioReminderModel: {
        create: () => {
          calls.push("reminder model");
          return {};
        },
      },
      PropertyDeskPropertyPortfolioModel: {
        create: (options) => {
          calls.push("portfolio model");
          passed.portfolioModel = options;
          return {};
        },
      },
      PropertyDeskPropertyPortfolioFilterModel: {
        create: () => {
          calls.push("filter model");
          return {};
        },
      },
      PropertyDeskPropertyViews: {
        create: (options) => {
          calls.push("property views");
          passed.views = options;
          return { renderProperties() {}, attachEvents() {} };
        },
      },
      PropertyDeskPropertyQuickNote: {
        create: (options) => {
          calls.push("quick note");
          passed.quickNote = options;
          return { editPropertyQuickNote };
        },
      },
      PropertyDeskPropertyViewEvents: {
        create: (options) => {
          calls.push("portfolio actions");
          passed.actions = options;
          return { attachEvents() {} };
        },
      },
      PropertyDeskPropertyAccountIndex: { groupByProperty: action },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features/property-portfolio-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow = context.window.PropertyDeskPropertyPortfolioWorkflow.create({
    $: action,
    state,
    toast: action,
    fetchAll: action,
    streetAddress: action,
    openPayment: action,
    propertyRepository,
    openPropertyDetails: action,
    openAccountForProperty: action,
    unusedDependency: true,
  });

  assert.deepEqual(calls, [
    "table",
    "reminder model",
    "account rows",
    "filter model",
    "portfolio model",
    "property views",
    "quick note",
    "portfolio actions",
  ]);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachPropertyActionEvents",
    "attachPropertyGridEvents",
    "renderProperties",
  ]);
  assert.equal(passed.quickNote.state, state);
  assert.equal(passed.portfolioModel.groupAccountsByProperty, action);
  assert.equal(passed.quickNote.toast, action);
  assert.equal(passed.quickNote.fetchAll, action);
  assert.equal(passed.quickNote.streetAddress, action);
  assert.equal(passed.quickNote.repository, propertyRepository);
  assert.equal("unusedDependency" in passed.quickNote, false);
  assert.deepEqual(Object.keys(passed.views).sort(), [
    "$",
    "esc",
    "portfolioModel",
    "portfolioTable",
    "state",
  ]);
  assert.equal("unusedDependency" in passed.views, false);
  assert.equal(passed.actions.$, action);
  assert.equal(passed.actions.openPayment, action);
  assert.equal(passed.actions.editPropertyQuickNote, editPropertyQuickNote);
  assert.equal(passed.actions.openPropertyDetails, action);
  assert.equal(passed.actions.openAccountForProperty, action);
});

test("Properties account-row model derives balances and reminder details", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-status-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-financial-summary.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-reminder-model.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-account-row-model.js",
      ),
      "utf8",
    ),
    context,
  );
  const state = {
    payments: [{ id: "payment-1" }],
    user: { user_metadata: { display_name: "Owner" } },
  };
  let reminderOptions;
  let scheduledAccountKeys;
  let dueAccountKeys;
  const reminderModel =
    context.window.PropertyDeskPropertyPortfolioReminderModel.create({
      state,
      propertyAddress: (property) => property.address,
      monthStart: () => "2026-10-01",
      dateOnly: () => new Date("2026-10-01T12:00:00"),
      monthEnd: () => "2026-10-31",
      lateReminderMailto: (options) => {
        reminderOptions = options;
        return `mailto:${options.email || ""}`;
      },
      money: (amount) => `$${amount.toFixed(2)}`,
    });
  const model =
    context.window.PropertyDeskPropertyPortfolioAccountRowModel.create({
      state,
      monthlyScheduledEstimate: ([account]) => {
        scheduledAccountKeys = Object.keys(account).sort();
        return account.payment_amount;
      },
      summarizeAccount:
        context.window.PropertyDeskAccountFinancialSummary.create({
          accountBalance: () => 5000,
          amountDueSince: (_accounts, payments) => (payments.length ? 35 : 100),
          unpaidDueAccrualStart: () => "2026-10-01",
          todayIso: () => "2026-10-05",
        }).summarizeAccount,
      amountDueSince: (accounts, payments) => {
        dueAccountKeys = Object.keys(accounts[0]).sort();
        return payments.length ? 35 : 100;
      },
      monthStart: () => "2026-10-01",
      monthEnd: () => "2026-10-31",
      paymentStatusInMonth: (_payments, _id, _monthStart, scheduled) =>
        scheduled === 100 ? "partial" : "none",
      reminderModel,
    });
  const property = { address: "1 Oak St" };
  const landContract = {
    id: "account-1",
    name: "Contract",
    party_name: "Buyer",
    party_email: "buyer@example.com",
    account_type: "land_contract",
    payment_amount: 250,
    payment_frequency: "monthly",
    start_date: "2020-01-01",
    next_due_date: "2026-10-01",
  };
  const row = model.buildAccountRow(property, landContract, "1 Oak St");

  assert.equal(row.unpaidDue, 35);
  assert.equal(row.scheduledPayment, 250);
  assert.equal(row.loanBalance, 5000);
  assert.equal(row.hasLoanBalance, true);
  assert.equal(row.paymentStatus, "partial");
  assert.equal(row.reminderHref, "mailto:buyer@example.com");
  assert.equal(row.recipientHint, "Draft late reminder email");
  assert.deepEqual(scheduledAccountKeys, [
    "id",
    "next_due_date",
    "payment_amount",
    "payment_frequency",
    "start_date",
    "status",
  ]);
  assert.deepEqual(dueAccountKeys, scheduledAccountKeys);
  assert.equal(reminderOptions.senderName, "Owner");
  assert.equal(reminderOptions.recipientName, "Buyer");
  assert.equal(reminderOptions.unpaidDue, "$35.00");

  const rental = model.buildAccountRow(
    property,
    { id: "account-2", name: "Rental", account_type: "rental" },
    "1 Oak St",
  );
  assert.equal(rental.loanBalance, 0);
  assert.equal(rental.hasLoanBalance, false);
  assert.equal(rental.partyName, "Rental");
  assert.equal(
    rental.recipientHint,
    "No email saved; opens an unaddressed late reminder draft",
  );
});

test("Properties reminder model builds the manual reminder details", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-status-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-reminder-model.js",
      ),
      "utf8",
    ),
    context,
  );
  const options = [];
  const model =
    context.window.PropertyDeskPropertyPortfolioReminderModel.create({
      state: { user: { user_metadata: { display_name: " Owner " } } },
      propertyAddress: (property) => property.address,
      monthStart: () => "2026-10-01",
      dateOnly: () => new Date("2026-10-01T12:00:00"),
      monthEnd: () => "2026-10-31",
      lateReminderMailto: (value) => {
        options.push(value);
        return "mailto:buyer@example.test";
      },
      money: (value) => `$${value.toFixed(2)}`,
    });

  const property = { address: "1 Oak St" };
  const account = {
    party_name: "Buyer",
    party_email: "buyer@example.test",
  };
  const reminder = model.buildReminderDetails(property, account, 35);

  assert.equal(reminder.reminderHref, "mailto:buyer@example.test");
  assert.equal(reminder.recipientHint, "Draft late reminder email");
  assert.deepEqual(JSON.parse(JSON.stringify(options[0])), {
    email: "buyer@example.test",
    address: "1 Oak St",
    subjectAddress: "1 Oak St",
    unpaidDue: "$35.00",
    senderName: "Owner",
    recipientName: "Buyer",
    month: "October 2026",
    asOf: "2026-10-31",
  });
});

test("Properties grid totals the visible due, monthly payments, and loan balances", () => {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "property-filter" ? "all" : "",
        checked: false,
        innerHTML: "",
        textContent: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-status-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-reminder-model.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-financial-summary.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-table.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-account-row-model.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-account-index.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-filter-model.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-views.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    properties: [{ id: "property-1", name: "One Oak", address: "1 Oak St" }],
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        status: "active",
        account_type: "land_contract",
        payment_amount: 125,
        payment_frequency: "monthly",
        name: "Contract",
        party_name: "Buyer",
      },
      {
        id: "account-2",
        property_id: "property-1",
        status: "active",
        account_type: "rental",
        payment_amount: 200,
        payment_frequency: "monthly",
        name: "Rental",
        party_name: "Tenant",
      },
    ],
    payments: [],
    propertyHolders: [],
    workspaceMembers: [],
    user: null,
  };
  const esc = (value) => String(value ?? "");
  const money = (value) => `$${Number(value).toFixed(2)}`;
  const dependencies = {
    state,
    monthlyScheduledEstimate: (accounts) =>
      accounts.reduce((sum, account) => sum + account.payment_amount, 0),
    accountBalance: (account) => (account.id === "account-1" ? 1000 : 0),
    amountDueSince: (accounts) => (accounts[0].id === "account-1" ? 50 : 80),
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    propertyAddress: (property) => property.address,
    monthStart: () => "2026-10-01",
    streetAddress: (property) => property.address,
    dateOnly: (value) => new Date(`${value}T12:00:00`),
    monthEnd: () => "2026-10-31",
    lateReminderMailto: () => "mailto:buyer@example.com",
    paymentStatusInMonth: () => "none",
    money,
  };
  dependencies.summarizeAccount =
    context.window.PropertyDeskAccountFinancialSummary.create({
      accountBalance: dependencies.accountBalance,
      amountDueSince: dependencies.amountDueSince,
      unpaidDueAccrualStart: dependencies.unpaidDueAccrualStart,
      todayIso: dependencies.todayIso,
    }).summarizeAccount;
  const portfolioTable =
    context.window.PropertyDeskPropertyPortfolioTable.create({
      esc,
      money,
      paymentFrequencyLabel: () => "Monthly",
    });
  const accountRowModel =
    context.window.PropertyDeskPropertyPortfolioAccountRowModel.create({
      state,
      monthlyScheduledEstimate: dependencies.monthlyScheduledEstimate,
      summarizeAccount: dependencies.summarizeAccount,
      amountDueSince: dependencies.amountDueSince,
      monthStart: dependencies.monthStart,
      monthEnd: dependencies.monthEnd,
      paymentStatusInMonth: dependencies.paymentStatusInMonth,
      reminderModel:
        context.window.PropertyDeskPropertyPortfolioReminderModel.create({
          state,
          propertyAddress: dependencies.propertyAddress,
          monthStart: dependencies.monthStart,
          dateOnly: dependencies.dateOnly,
          monthEnd: dependencies.monthEnd,
          lateReminderMailto: dependencies.lateReminderMailto,
          money,
        }),
    });
  const filterModel =
    context.window.PropertyDeskPropertyPortfolioFilterModel.create({
      state,
      propertyAddress: dependencies.propertyAddress,
    });
  const portfolioModel =
    context.window.PropertyDeskPropertyPortfolioModel.create({
      state,
      accountRowModel,
      groupAccountsByProperty:
        context.window.PropertyDeskPropertyAccountIndex.groupByProperty,
      streetAddress: dependencies.streetAddress,
      filterModel,
    });
  const feature = context.window.PropertyDeskPropertyViews.create({
    $: getElement,
    state,
    esc,
    portfolioTable,
    portfolioModel,
  });

  assert.deepEqual(Object.keys(feature).sort(), [
    "attachEvents",
    "renderProperties",
  ]);
  feature.renderProperties();

  const totals = getElement("properties-totals");
  const tableRows = getElement("properties-table").innerHTML;
  assert.ok(tableRows.indexOf("Buyer") < tableRows.indexOf("Tenant"));
  assert.match(totals.innerHTML, /\$130\.00/);
  assert.match(totals.innerHTML, /\$325\.00/);
  assert.match(totals.innerHTML, /\$1000\.00/);

  getElement("property-filter").value = "rental";
  feature.renderProperties();
  assert.match(totals.innerHTML, /\$80\.00/);
  assert.match(totals.innerHTML, /\$200\.00/);
  assert.ok(totals.innerHTML.includes("—"));
});
