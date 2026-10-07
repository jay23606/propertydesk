const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRepositoryWriteFeedback } = require("./feature-test-helpers.cjs");

test("app connects account and deposit actions without workflow wrappers", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskDepositDetails\.create\(/);
  const accountMaintenance = app.indexOf(
    "PropertyDeskAccountCloseMaintenance.create(",
  );
  const accountEntry = app.indexOf("PropertyDeskAccountCloseEntry.create(");
  const accountEvents = app.indexOf("PropertyDeskAccountDetailEvents.create(");
  const depositMaintenance = app.indexOf(
    "PropertyDeskDepositMaintenance.create(",
  );
  const depositEntry = app.indexOf(
    "PropertyDeskDepositAdjustmentEntry.create(",
  );
  const depositEvents = app.indexOf("PropertyDeskDepositDetailEvents.create(");
  assert.ok(accountMaintenance < accountEntry && accountEntry < accountEvents);
  assert.ok(depositMaintenance < depositEntry && depositEntry < depositEvents);
  assert.match(
    app,
    /closeAccountDetails: \(\) => closeModal\(\$\("detail-modal"\)\)/,
  );
  assert.match(
    app,
    /PropertyDeskAccountCloseEntry\.create\(\{\s*saveCloseAccount,/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailEvents\.create\(\{[\s\S]*?closeAccount,/,
  );
  assert.match(
    app,
    /PropertyDeskDepositAdjustmentEntry\.create\(\{[\s\S]*?saveDepositAdjustment,/,
  );
  assert.match(
    app,
    /PropertyDeskDepositDetailEvents\.create\(\{[\s\S]*?recordDepositAdjustment,/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountHistoryDetails\.create\(/);
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachAccountDetailActionEvents,\s*attachDepositEvents,/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountDetailsWorkflow\.create\(/);
});

test("account detail content workflow composes schedule and selected account", () => {
  const passed = {};
  const accountLoanScheduleHTML = () => "schedule";
  const renderAccountDetails = () => "details";
  const renderAccountHistory = () => "history";
  const depositSectionHTML = () => "deposit";
  const openAccountDetails = () => "opened";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountLoanScheduleView: {
        create: (options) => {
          passed.schedule = options;
          return { accountLoanScheduleHTML };
        },
      },
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          passed.view = options;
          return { renderAccountDetails };
        },
      },
      PropertyDeskAccountDetailsModel: {
        create: (options) => {
          passed.model = options;
          return { buildAccountDetailData: () => ({}) };
        },
      },
      PropertyDeskAccountFinancialSummary: {
        create: (options) => {
          passed.financialSummary = options;
          return { summarizeAccount: () => ({}) };
        },
      },
      PropertyDeskAccountDetails: {
        create: (options) => {
          passed.details = options;
          return { openAccountDetails };
        },
      },
      PropertyDeskAccountHistoryDetails: {
        create: (options) => {
          passed.history = options;
          return { renderAccountHistory };
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
        "account-detail-content-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    money() {},
    fmtDate() {},
    esc() {},
    sumPosted() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    amortizationSchedule() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    todayIso() {},
    openModal() {},
    propertyAddress() {},
    depositSectionHTML,
  };
  const workflow =
    context.window.PropertyDeskAccountDetailContentWorkflow.create(
      dependencies,
    );

  assert.equal(passed.view.accountLoanScheduleHTML, accountLoanScheduleHTML);
  assert.equal(passed.history.state, dependencies.state);
  assert.equal(passed.history.esc, dependencies.esc);
  assert.equal(passed.model.state, dependencies.state);
  assert.equal(passed.model.sumPosted, dependencies.sumPosted);
  assert.equal(
    passed.financialSummary.accountBalance,
    dependencies.accountBalance,
  );
  assert.equal(typeof passed.model.summarizeAccount, "function");
  assert.equal(passed.details.renderAccountDetails, renderAccountDetails);
  assert.equal(typeof passed.details.buildAccountDetailData, "function");
  assert.equal(passed.details.renderAccountHistory, renderAccountHistory);
  assert.equal(
    passed.details.depositSectionHTML,
    dependencies.depositSectionHTML,
  );
  assert.deepEqual(Object.keys(workflow), ["openAccountDetails"]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
});

test("account history details connect the history query and rendering", async () => {
  const passed = {};
  const accountHistoryHTML = (history) => history;
  const history = { auditError: false };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountHistoryModel: {
        create: (options) => {
          passed.model = options;
          return { loadAccountHistory: async () => history };
        },
      },
      PropertyDeskAccountHistoryView: {
        create: (options) => {
          passed.view = options;
          return { accountHistoryHTML };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-history-details.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    state: {},
    esc() {},
    money() {},
    fmtDate() {},
  };
  const feature =
    context.window.PropertyDeskAccountHistoryDetails.create(dependencies);

  assert.equal(passed.model.state, dependencies.state);
  assert.equal(await feature.renderAccountHistory({}, []), history);
  assert.equal(passed.view.esc, dependencies.esc);
});

test("account close maintenance preserves the account history", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const calls = [];
  const messages = [];
  const state = {
    client: {
      from(table) {
        return {
          update(payload) {
            updates.push([table, payload]);
            return {
              async eq(column, value) {
                updates.push([column, value]);
                return { error: null };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    state,
    closeAccountDetails: () => calls.push(["close-details"]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close-details"], "refresh"]);
  assert.equal(messages.at(-1), "Account closed");
});

test("account close maintenance reports rejected requests without closing details", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    state: {
      client: {
        from: () => ({
          update: () => ({
            eq: async () => {
              throw new Error("offline");
            },
          }),
        }),
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.saveCloseAccount({ id: "account-1", name: "Rental" }),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(messages, [
    "Account couldn't be closed right now. Please try again.",
  ]);
});

test("account close maintenance reports database errors before closing details", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    state: { client: {} },
    repository: {
      close: async (client, id) => {
        calls.push(["close", client, id]);
        return { error: { message: "Permission denied" } };
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.deepEqual(calls, [["close", {}, "account-1"]]);
  assert.deepEqual(messages, ["Permission denied"]);
});

test("account close entry confirms before delegating to persistence", async () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const account = { id: "account-1", name: "Rental" };
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    saveCloseAccount: (value) => calls.push(["save", value]),
  });

  await entry.closeAccount(account);

  assert.deepEqual(calls, [
    [
      "confirm",
      "Close “Rental”? Its payment history will remain in your records.",
    ],
    ["save", account],
  ]);
});

test("account close entry does not persist when confirmation is declined", () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: () => false,
    saveCloseAccount: () => calls.push("save"),
  });

  assert.equal(entry.closeAccount({ id: "account-1", name: "Rental" }), false);
  assert.deepEqual(calls, []);
});
