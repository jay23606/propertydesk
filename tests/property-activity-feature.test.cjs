const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property activity details include posted and voided records without counting voids", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-activity-transactions.js",
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
    getPayments: () => [
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
    getExpenses: () => [
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
    workflows: {
      transactions: context.window.PropertyDeskPropertyActivityTransactions,
      model: context.window.PropertyDeskPropertyActivityModel,
      view: context.window.PropertyDeskPropertyActivityView,
    },
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
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-activity-details.js"),
      "utf8",
    ),
    /window\.PropertyDeskPropertyActivity(?:Transactions|Model|View)\.create/,
  );
});

test("property activity model aggregates posted cash flow and sorts eight recent rows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-activity-transactions.js",
      ),
      "utf8",
    ),
    context,
  );
  const { buildRecentTransactions } =
    context.window.PropertyDeskPropertyActivityTransactions.create();
  delete context.window.PropertyDeskPropertyActivityTransactions;
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
    getPayments: () => state.payments,
    getExpenses: () => state.expenses,
    buildRecentTransactions,
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
  let accountTableContext;
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
      PropertyDeskPropertyDetailsAccountTable: {
        create: (options) => {
          accountTableContext = options;
          return { propertyAccountsHTML: () => "accounts html" };
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
    beginAuditRequest() {},
    setSelectedPropertyId() {},
    getPayments() {},
    getExpenses() {},
    getProperties() {},
    getAccounts() {},
    getDocuments() {},
    getWorkspaceMembers() {},
    getPropertyHolders() {},
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
    unusedDependency: true,
    workflows: {
      documentsView: context.window.PropertyDeskPropertyDocumentsView,
      accountTable: context.window.PropertyDeskPropertyDetailsAccountTable,
      detailsView: context.window.PropertyDeskPropertyDetailsView,
      activityDetails: context.window.PropertyDeskPropertyActivityDetails,
      activityModules: {
        transactions: {},
        model: {},
        view: {},
      },
      detailsModel: context.window.PropertyDeskPropertyDetailsModel,
      details: context.window.PropertyDeskPropertyDetails,
    },
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailContentWorkflow.create(
      detailsDependencies,
    );
  const contentWorkflowSource = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-detail-content-workflow.js",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    contentWorkflowSource,
    /window\.PropertyDeskProperty(?:DocumentsView|DetailsAccountTable|DetailsView|ActivityDetails|DetailsModel|Details)\.create/,
  );

  assert.equal(viewContext.fmtDate, detailsDependencies.fmtDate);
  assert.equal(viewContext.esc, detailsDependencies.esc);
  const detailsViewDependencies = {
    money: detailsDependencies.money,
    esc: detailsDependencies.esc,
    propertyAccountsHTML: viewContext.details.propertyAccountsHTML,
  };
  assert.deepEqual(
    Object.keys(viewContext.details).sort(),
    [...Object.keys(detailsViewDependencies), "propertyDocumentsHTML"].sort(),
  );
  assert.equal(
    viewContext.details.propertyDocumentsHTML,
    propertyDocumentsHTML,
  );
  assert.equal(accountTableContext.money, detailsDependencies.money);
  assert.equal(
    accountTableContext.accountBalance,
    detailsDependencies.accountBalance,
  );
  assert.equal(detailContext.propertyDetailsHTML, propertyDetailsHTML);
  assert.equal("unusedDependency" in detailContext, false);
  assert.equal(
    detailContext.beginAuditRequest,
    detailsDependencies.beginAuditRequest,
  );
  assert.equal(
    detailContext.setSelectedPropertyId,
    detailsDependencies.setSelectedPropertyId,
  );
  assert.equal(detailContext.renderPropertyActivity, renderPropertyActivity);
  assert.equal(modelContext.getProperties, detailsDependencies.getProperties);
  assert.equal(modelContext.getAccounts, detailsDependencies.getAccounts);
  assert.equal(modelContext.getDocuments, detailsDependencies.getDocuments);
  assert.equal(
    modelContext.getWorkspaceMembers,
    detailsDependencies.getWorkspaceMembers,
  );
  assert.equal(
    modelContext.getPropertyHolders,
    detailsDependencies.getPropertyHolders,
  );
  assert.equal(
    modelContext.propertyAddress,
    detailsDependencies.propertyAddress,
  );
  assert.equal(typeof detailContext.buildPropertyDetailData, "function");
  assert.equal(activityContext.getPayments, detailsDependencies.getPayments);
  assert.equal(activityContext.getExpenses, detailsDependencies.getExpenses);
  assert.equal(activityContext.isPosted, detailsDependencies.isPosted);
  assert.equal(activityContext.sumIncome, detailsDependencies.sumIncome);
  assert.deepEqual(JSON.parse(JSON.stringify(activityContext.workflows)), {
    transactions: {},
    model: {},
    view: {},
  });
  assert.deepEqual(Object.keys(workflow), ["openPropertyDetails"]);
  assert.equal(workflow.openPropertyDetails(), "property details");
});
