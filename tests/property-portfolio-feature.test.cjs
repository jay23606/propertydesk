const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("app composes the Properties grid and action workflows explicitly", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const order = [
    "PropertyDeskPropertyPortfolioTable.create(",
    "PropertyDeskPropertyPortfolioAccountRowModel.create(",
    "PropertyDeskPropertyPortfolioModel.create(",
    "PropertyDeskPropertyViews.create(",
    "PropertyDeskPropertyPortfolioActionsWorkflow.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskPropertyPortfolioModel.create\(\{\s*state,\s*accountRowModel: portfolioAccountRowModel,/,
  );
  assert.match(
    app,
    /PropertyDeskPropertyViews.create\(\{\s*\$,\s*state,\s*esc,\s*portfolioTable,\s*portfolioModel,/,
  );
  assert.match(app, /PropertyDeskPropertyPortfolioActionsWorkflow\.create\(/);
  assert.match(
    app,
    /function attachPropertyPortfolioEvents\(\) \{\s*attachPropertyGridEvents\(\);\s*attachPropertyActionEvents\(\);/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskPropertyPortfolioScreenWorkflow\.create\(/,
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

test("property portfolio indexes accounts and holders once per grid build", () => {
  const iterations = { properties: 0, accounts: 0, holders: 0 };
  const track = (name, rows) => ({
    [Symbol.iterator]: function* () {
      iterations[name]++;
      yield* rows;
    },
  });
  const properties = [
    { id: "property-1", name: "Oak", address: "1 Oak St" },
    { id: "property-2", name: "Vacant", address: "2 Oak St" },
    { id: "property-3", name: "Inactive", address: "3 Oak St" },
    {
      id: "property-4",
      name: "Archived",
      address: "4 Oak St",
      archived_at: "2026-01-01",
    },
  ];
  const accounts = [
    {
      id: "account-1",
      property_id: "property-1",
      status: "active",
      account_type: "land_contract",
      party_name: "Buyer One",
      name: "Contract",
    },
    {
      id: "account-2",
      property_id: "property-3",
      status: "inactive",
      account_type: "rental",
      party_name: "Former Tenant",
      name: "Rental",
    },
  ];
  const state = {
    properties: track("properties", properties),
    accounts: track("accounts", accounts),
    propertyHolders: track("holders", [
      { property_id: "property-1", member_user_id: "member-1" },
      { property_id: "property-2", member_user_id: "member-2" },
    ]),
  };
  const context = vm.createContext({ window: {} });
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
  const model = context.window.PropertyDeskPropertyPortfolioModel.create({
    state,
    accountRowModel: {
      buildAccountRow: (property, account, street) => ({
        hasAccount: true,
        party: account.party_name,
        account: account.name,
        address: street,
        id: account.id,
        property,
      }),
    },
    propertyAddress: (property) => property.address,
    streetAddress: (property) => property.name,
  });

  const rows = model.buildRows({
    query: "",
    type: "all",
    holderId: "all",
    showArchived: false,
  });
  assert.deepEqual(
    Array.from(rows, (row) => row.id),
    ["account-1", "property-2"],
  );
  assert.deepEqual(iterations, { properties: 1, accounts: 1, holders: 1 });

  const assignedRows = model.buildRows({
    query: "buyer",
    type: "all",
    holderId: "member-1",
    showArchived: false,
  });
  assert.deepEqual(
    Array.from(assignedRows, (row) => row.id),
    ["account-1"],
  );
  assert.deepEqual(iterations, { properties: 2, accounts: 2, holders: 2 });
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
