const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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
      path.join(__dirname, "..", "features", "property-portfolio-table.js"),
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
  const portfolioModel =
    context.window.PropertyDeskPropertyPortfolioModel.create(dependencies);
  const feature = context.window.PropertyDeskPropertyViews.create({
    $: getElement,
    state,
    esc,
    portfolioTable,
    portfolioModel,
  });

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


test("property portfolio workflow connects its model, table, and action routers", () => {
  const passed = {};
  const action = () => {};
  const state = {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyQuickNote: {
        create: (options) => {
          passed.quickNoteOptions = options;
          return { editPropertyQuickNote: action };
        },
      },
      PropertyDeskPropertyPortfolioTable: {
        create: (options) => {
          passed.tableOptions = options;
          return "table";
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
            attachEvents: () => "filters",
          };
        },
      },
      PropertyDeskPropertyViewEvents: {
        create: (options) => {
          passed.actionOptions = options;
          return { attachEvents: () => "actions" };
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
    toast: action,
    fetchAll: action,
    esc: action,
    money: action,
    paymentFrequencyLabel: action,
    monthlyScheduledEstimate: action,
    accountBalance: action,
    amountDueSince: action,
    unpaidDueAccrualStart: action,
    todayIso: action,
    propertyAddress: action,
    monthStart: action,
    streetAddress: action,
    dateOnly: action,
    monthEnd: action,
    lateReminderMailto: action,
    paymentStatusInMonth: action,
    openPayment: action,
    openPropertyDetails: action,
    resetAccountForm: action,
    populateFormOptions: action,
    openModal: action,
  });

  assert.equal(passed.viewOptions.portfolioTable, "table");
  assert.equal(passed.viewOptions.portfolioModel, "model");
  assert.equal(passed.quickNoteOptions.state, state);
  assert.equal(passed.quickNoteOptions.toast, action);
  assert.equal(passed.quickNoteOptions.fetchAll, action);
  assert.equal(passed.quickNoteOptions.streetAddress, action);
  assert.equal(passed.actionOptions.openPayment, action);
  assert.equal(passed.actionOptions.editPropertyQuickNote, action);
  assert.equal(workflow.renderProperties(), "properties");
  assert.equal(workflow.attachPropertyViewEvents(), "filters");
  assert.equal(workflow.attachPropertyActionEvents(), "actions");
});

