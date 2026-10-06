const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property activity details include posted and voided records without counting voids", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-activity-model.js",
    "property-activity-view.js",
    "property-activity-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const activity = context.window.PropertyDeskPropertyActivityDetails.create({
    state: {
      payments: [
        {
          account_id: "account-1",
          amount: 500,
          received_date: "2026-10-04",
          status: "posted",
          memo: "October rent",
        },
        {
          account_id: "account-1",
          amount: 90,
          received_date: "2026-10-03",
          status: "voided",
          memo: "<cancelled>",
        },
      ],
      expenses: [
        {
          property_id: "property-1",
          amount: 75,
          expense_date: "2026-10-02",
          status: "posted",
          payee: "Plumber",
        },
        {
          property_id: "property-1",
          amount: 40,
          expense_date: "2026-10-01",
          status: "voided",
          payee: "Old vendor",
        },
      ],
    },
    isPosted: (record) => record.status !== "voided",
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    money: (amount) =>
      `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    fmtDate: (date) => date,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  });

  const result = activity.renderPropertyActivity("property-1", [
    { id: "account-1", name: "Rental" },
  ]);
  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 75);
  assert.match(result.html, /October rent/);
  assert.match(result.html, /transaction-voided/);
  assert.match(result.html, /&lt;cancelled&gt;/);
  assert.match(result.html, /−\$75\.00/);
});

test("property activity model aggregates posted cash flow and sorts eight recent rows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-activity-model.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    payments: [
      {
        account_id: "account-1",
        amount: 500,
        received_date: "2026-10-04",
        status: "posted",
      },
      {
        account_id: "other-account",
        amount: 999,
        received_date: "2026-10-05",
        status: "posted",
      },
    ],
    expenses: Array.from({ length: 9 }, (_, index) => ({
      property_id: "property-1",
      amount: index + 1,
      expense_date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      status: "posted",
      payee: `Vendor ${index + 1}`,
    })),
  };
  const statusChecks = [];
  const model = context.window.PropertyDeskPropertyActivityModel.create({
    state,
    isPosted: (record) => {
      statusChecks.push(record);
      return record.status === "posted";
    },
    sumIncome: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) =>
      rows.reduce((total, row) => total + Number(row.amount || 0), 0),
  });

  const result = model.buildPropertyActivity("property-1", [
    { id: "account-1", name: "Rental" },
  ]);

  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 45);
  assert.equal(result.transactions.length, 8);
  assert.equal(result.transactions[0].date, "2026-10-09");
  assert.equal(result.transactions[0].amount, -9);
  assert.equal(result.transactions.at(-1).date, "2026-10-03");
  assert.equal(statusChecks.length, 10);
});

test("property detail content workflow connects activity summaries to property rendering", () => {
  let detailContext;
  let viewContext;
  let activityContext;
  let modelContext;
  const renderPropertyActivity = () => "activity";
  const propertyDetailsHTML = () => "property details html";
  const propertyDocumentsHTML = () => "documents html";
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyDocumentsView: {
        create: (options) => {
          viewContext = options;
          return { propertyDocumentsHTML };
        },
      },
      PropertyDeskPropertyDetailsView: {
        create: (options) => {
          viewContext.details = options;
          return { propertyDetailsHTML };
        },
      },
      PropertyDeskPropertyActivityDetails: {
        create: (options) => {
          activityContext = options;
          return { renderPropertyActivity };
        },
      },
      PropertyDeskPropertyDetailsModel: {
        create: (options) => {
          modelContext = options;
          return { buildPropertyDetailData: () => ({}) };
        },
      },
      PropertyDeskPropertyDetails: {
        create: (options) => {
          detailContext = options;
          return { openPropertyDetails: () => "property details" };
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
        "property-detail-content-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const detailsDependencies = {
    $() {},
    state: {},
    isPosted() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    money() {},
    fmtDate() {},
    esc() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    openModal() {},
    propertyAddress() {},
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailContentWorkflow.create(
      detailsDependencies,
    );

  assert.equal(viewContext.fmtDate, detailsDependencies.fmtDate);
  assert.equal(viewContext.esc, detailsDependencies.esc);
  const detailsViewDependencies = {
    money: detailsDependencies.money,
    esc: detailsDependencies.esc,
    prettyType: detailsDependencies.prettyType,
    paymentFrequencyLabel: detailsDependencies.paymentFrequencyLabel,
    accountBalance: detailsDependencies.accountBalance,
  };
  assert.deepEqual(
    Object.keys(viewContext.details).sort(),
    [...Object.keys(detailsViewDependencies), "propertyDocumentsHTML"].sort(),
  );
  assert.equal(
    viewContext.details.propertyDocumentsHTML,
    propertyDocumentsHTML,
  );
  assert.equal(detailContext.propertyDetailsHTML, propertyDetailsHTML);
  assert.equal(detailContext.renderPropertyActivity, renderPropertyActivity);
  assert.equal(modelContext.state, detailsDependencies.state);
  assert.equal(
    modelContext.propertyAddress,
    detailsDependencies.propertyAddress,
  );
  assert.equal(typeof detailContext.buildPropertyDetailData, "function");
  assert.equal(activityContext.state, detailsDependencies.state);
  assert.equal(activityContext.isPosted, detailsDependencies.isPosted);
  assert.equal(activityContext.sumIncome, detailsDependencies.sumIncome);
  assert.deepEqual(Object.keys(workflow), ["openPropertyDetails"]);
  assert.equal(workflow.openPropertyDetails(), "property details");
});
