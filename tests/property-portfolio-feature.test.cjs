const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("Properties screen workflow connects the grid and quick-action binders", () => {
  const created = [];
  const passed = {};
  const renderProperties = () => "properties";
  const attachPortfolioEvents = () => "grid events";
  const attachPortfolioActionEvents = () => "action events";
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyPortfolioWorkflow: {
        create: (options) => {
          created.push("grid");
          passed.grid = options;
          return { renderProperties, attachEvents: attachPortfolioEvents };
        },
      },
      PropertyDeskPropertyPortfolioActionsWorkflow: {
        create: (options) => {
          created.push("actions");
          passed.actions = options;
          return { attachEvents: attachPortfolioActionEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-screen-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    esc() {},
    money() {},
    paymentFrequencyLabel() {},
    monthlyScheduledEstimate() {},
    accountBalance() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    todayIso() {},
    propertyAddress() {},
    streetAddress() {},
    monthStart() {},
    dateOnly() {},
    monthEnd() {},
    lateReminderMailto() {},
    paymentStatusInMonth() {},
    toast() {},
    fetchAll() {},
    openPayment() {},
    openPropertyDetails() {},
    openAccountForProperty() {},
  };
  const workflow =
    context.window.PropertyDeskPropertyPortfolioScreenWorkflow.create(
      dependencies,
    );

  assert.deepEqual(created, ["grid", "actions"]);
  assert.notEqual(passed.grid, dependencies);
  assert.notEqual(passed.actions, dependencies);
  assert.deepEqual(Object.keys(passed.grid), [
    "$",
    "state",
    "esc",
    "money",
    "paymentFrequencyLabel",
    "monthlyScheduledEstimate",
    "accountBalance",
    "amountDueSince",
    "unpaidDueAccrualStart",
    "todayIso",
    "propertyAddress",
    "streetAddress",
    "monthStart",
    "dateOnly",
    "monthEnd",
    "lateReminderMailto",
    "paymentStatusInMonth",
  ]);
  assert.deepEqual(Object.keys(passed.actions), [
    "$",
    "state",
    "toast",
    "fetchAll",
    "streetAddress",
    "openPayment",
    "openPropertyDetails",
    "openAccountForProperty",
  ]);
  assert.deepEqual(Object.keys(workflow), [
    "renderProperties",
    "attachPortfolioEvents",
    "attachPortfolioActionEvents",
  ]);
  assert.equal(workflow.renderProperties, renderProperties);
  assert.equal(workflow.attachPortfolioEvents, attachPortfolioEvents);
  assert.equal(
    workflow.attachPortfolioActionEvents,
    attachPortfolioActionEvents,
  );
});

test("Properties account-row model derives balances and reminder details", () => {
  const context = vm.createContext({ window: {} });
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
  const model =
    context.window.PropertyDeskPropertyPortfolioAccountRowModel.create({
      state,
      monthlyScheduledEstimate: ([account]) => account.payment_amount,
      accountBalance: () => 5000,
      amountDueSince: (_accounts, payments) => (payments.length ? 35 : 100),
      unpaidDueAccrualStart: () => "2026-10-01",
      todayIso: () => "2026-10-05",
      propertyAddress: (property) => property.address,
      monthStart: () => "2026-10-01",
      dateOnly: () => new Date("2026-10-01T12:00:00"),
      monthEnd: () => "2026-10-31",
      lateReminderMailto: (options) => {
        reminderOptions = options;
        return `mailto:${options.email || ""}`;
      },
      paymentStatusInMonth: (_payments, _id, _monthStart, scheduled) =>
        scheduled === 100 ? "partial" : "none",
      money: (amount) => `$${amount.toFixed(2)}`,
    });
  const property = { address: "1 Oak St" };
  const landContract = {
    id: "account-1",
    name: "Contract",
    party_name: "Buyer",
    party_email: "buyer@example.com",
    account_type: "land_contract",
    payment_amount: 250,
  };
  const row = model.buildAccountRow(property, landContract, "1 Oak St");

  assert.equal(row.unpaidDue, 35);
  assert.equal(row.scheduledPayment, 250);
  assert.equal(row.loanBalance, 5000);
  assert.equal(row.hasLoanBalance, true);
  assert.equal(row.paymentStatus, "partial");
  assert.equal(row.reminderHref, "mailto:buyer@example.com");
  assert.equal(row.recipientHint, "Draft late reminder email");
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
      path.join(__dirname, "..", "features", "property-portfolio-model.js"),
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
  const portfolioTable =
    context.window.PropertyDeskPropertyPortfolioTable.create({
      esc,
      money,
      paymentFrequencyLabel: () => "Monthly",
    });
  const accountRowModel =
    context.window.PropertyDeskPropertyPortfolioAccountRowModel.create(
      dependencies,
    );
  const portfolioModel =
    context.window.PropertyDeskPropertyPortfolioModel.create({
      state,
      accountRowModel,
      propertyAddress: dependencies.propertyAddress,
      streetAddress: dependencies.streetAddress,
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

test("property portfolio workflow connects its filter model and read view", () => {
  const passed = {};
  const action = () => {};
  let attached = 0;
  const state = {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyPortfolioTable: {
        create: (options) => {
          passed.tableOptions = options;
          return "table";
        },
      },
      PropertyDeskPropertyPortfolioAccountRowModel: {
        create: (options) => {
          passed.accountRowOptions = options;
          return "account rows";
        },
      },
      PropertyDeskPropertyPortfolioModel: {
        create: (options) => {
          passed.modelOptions = options;
          return "model";
        },
      },
      PropertyDeskPropertyViews: {
        create: (options) => {
          passed.viewOptions = options;
          return {
            renderProperties: () => "properties",
            attachEvents: () => attached++,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-workflow.js"),
      "utf8",
    ),
    context,
  );
  const workflow = context.window.PropertyDeskPropertyPortfolioWorkflow.create({
    state,
    esc: action,
    money: action,
    paymentFrequencyLabel: action,
    monthlyScheduledEstimate: action,
    accountBalance: action,
    amountDueSince: action,
    unpaidDueAccrualStart: action,
    todayIso: action,
    propertyAddress: action,
    streetAddress: action,
    monthStart: action,
    dateOnly: action,
    monthEnd: action,
    lateReminderMailto: action,
    paymentStatusInMonth: action,
  });

  assert.equal(passed.viewOptions.portfolioTable, "table");
  assert.equal(passed.modelOptions.accountRowModel, "account rows");
  assert.equal(passed.accountRowOptions.state, state);
  assert.equal(passed.accountRowOptions.amountDueSince, action);
  assert.equal(passed.viewOptions.portfolioModel, "model");
  assert.equal(passed.modelOptions.streetAddress, action);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachEvents",
    "renderProperties",
  ]);
  assert.equal(workflow.renderProperties(), "properties");
  workflow.attachEvents();
  assert.equal(attached, 1);
});

test("property portfolio actions workflow owns quick-note and grid action routing", () => {
  const passed = {};
  const action = () => {};
  let attached = 0;
  const state = {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyQuickNote: {
        create: (options) => {
          passed.quickNoteOptions = options;
          return { editPropertyQuickNote: action };
        },
      },
      PropertyDeskPropertyViewEvents: {
        create: (options) => {
          passed.actionOptions = options;
          return { attachEvents: () => attached++ };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-actions-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const workflow =
    context.window.PropertyDeskPropertyPortfolioActionsWorkflow.create({
      $: action,
      state,
      toast: action,
      fetchAll: action,
      streetAddress: action,
      openPayment: action,
      openPropertyDetails: action,
      openAccountForProperty: action,
    });

  assert.equal(passed.quickNoteOptions.state, state);
  assert.equal(passed.quickNoteOptions.toast, action);
  assert.equal(passed.quickNoteOptions.fetchAll, action);
  assert.equal(passed.quickNoteOptions.streetAddress, action);
  assert.equal(passed.actionOptions.openPayment, action);
  assert.equal(passed.actionOptions.editPropertyQuickNote, action);
  assert.equal(passed.actionOptions.openAccountForProperty, action);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});
