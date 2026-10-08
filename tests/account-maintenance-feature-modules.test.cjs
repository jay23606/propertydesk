const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRepositoryWriteFeedback } = require("./feature-test-helpers.cjs");

test("app delegates account actions and deposit adjustments to separate workflows", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskDepositWorkspaceWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskAccountScreenWorkflow\.create\(\{[\s\S]*?depositSectionHTML: depositWorkspace\.depositSectionHTML,[\s\S]*?accountActions:/,
  );
  assert.doesNotMatch(app, /PropertyDeskDepositDetails(?:Model|View)\.create/);
  assert.doesNotMatch(app, /PropertyDeskAccountDetailActionWorkflow\.create/);
  const accountScreenWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-screen-workflow.js"),
    "utf8",
  );
  assert.match(
    accountScreenWorkflow,
    /AccountDetailContentWorkflow\.create\(\{[\s\S]*?accountHistoryRepository: content\.accountHistoryRepository/,
  );
  assert.match(
    accountScreenWorkflow,
    /depositSectionHTML: content\.depositSectionHTML/,
  );
  assert.doesNotMatch(
    accountScreenWorkflow,
    /DepositDetailsWorkflow|DepositAdjustmentWorkflow/,
  );
  assert.match(
    accountScreenWorkflow,
    /AccountDetailActionWorkflow\.create\(\{[\s\S]*?repository: accountActions\.repository/,
  );
  const depositWorkspaceWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "deposit-workspace-workflow.js"),
    "utf8",
  );
  assert.match(
    depositWorkspaceWorkflow,
    /DepositDetailsWorkflow\.create\([\s\S]*?depositLedger: details\.depositLedger/,
  );
  assert.match(
    depositWorkspaceWorkflow,
    /DepositAdjustmentWorkflow\.create\([\s\S]*?depositSectionHTML,/,
  );
  const accountWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-detail-action-workflow.js"),
    "utf8",
  );
  for (const feature of [
    "PropertyDeskAccountCloseMaintenance",
    "PropertyDeskAccountCloseEntry",
    "PropertyDeskAccountDetailEvents",
  ])
    assert.match(accountWorkflow, new RegExp(`${feature}\\.create\\(`));
  assert.match(
    accountWorkflow,
    /closeAccountDetails: \(\) => closeModal\(\$\("detail-modal"\)\)/,
  );
  assert.match(accountWorkflow, /repository,/);
  const depositWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "deposit-adjustment-workflow.js"),
    "utf8",
  );
  for (const feature of [
    "PropertyDeskDepositMaintenance",
    "PropertyDeskDepositAdjustmentEntry",
    "PropertyDeskDepositDetailEvents",
  ])
    assert.match(depositWorkflow, new RegExp(`${feature}\\.create\\(`));
  assert.match(depositWorkflow, /repository,/);
  assert.match(app, /repository: repositories\.transactions/);
  assert.match(
    app,
    /resolveVoidTarget:\s*window\.PropertyDeskTransactionVoidModel\.resolveVoidTarget/,
  );
  assert.match(
    app,
    /buildVoidPayload:\s*window\.PropertyDeskTransactionVoidModel\.buildVoidPayload/,
  );
  assert.match(
    app,
    /findCorrectionTarget:\s*window\.PropertyDeskTransactionCorrectionModel\.findCorrectionTarget/,
  );
  assert.match(app, /repository: repositories\.accounts/);
  assert.match(app, /repository: repositories\.deposits/);
  assert.match(
    app,
    /prepareAdjustment:\s*window\.PropertyDeskDepositAdjustmentModel\.prepare/,
  );
  assert.match(
    app,
    /validateAdjustment:\s*window\.PropertyDeskDepositAdjustmentModel\.validate/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountHistoryDetails\.create\(/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachAccountDetailActionEvents,\s*depositWorkspace\.attachDepositAdjustmentEvents,/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountDetailsWorkflow\.create\(/);
});

test("account screen workflow composes only account detail and close actions", () => {
  const calls = [];
  const context = vm.createContext({
    window: {
      PropertyDeskAccountDetailContentWorkflow: {
        create(content) {
          calls.push(["content", content]);
          return { openAccountDetails() {} };
        },
      },
      PropertyDeskAccountDetailActionWorkflow: {
        create(actions) {
          calls.push(["accountActions", actions]);
          return { attachAccountDetailActionEvents() {} };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-screen-workflow.js"),
      "utf8",
    ),
    context,
  );
  const content = {
    $() {},
    state: {},
    money() {},
    fmtDate() {},
    esc() {},
    sumPosted() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    summarizeAccount() {},
    amortizationSchedule() {},
    openModal() {},
    propertyAddress() {},
    depositSectionHTML() {},
    accountHistoryRepository: {},
    unusedContentValue: true,
  };
  const accountActions = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
    repository: { close() {} },
    unusedDependency: true,
  };
  const workflow = context.window.PropertyDeskAccountScreenWorkflow.create({
    content,
    accountActions,
  });

  assert.equal(calls[0][0], "content");
  assert.equal(calls[0][1].state, content.state);
  assert.equal(
    calls[0][1].accountHistoryRepository,
    content.accountHistoryRepository,
  );
  assert.equal(calls[0][1].depositSectionHTML, content.depositSectionHTML);
  assert.equal("unusedContentValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "$",
    "accountHistoryRepository",
    "amortizationSchedule",
    "depositSectionHTML",
    "esc",
    "fmtDate",
    "money",
    "openModal",
    "paymentFrequencyLabel",
    "prettyType",
    "propertyAddress",
    "state",
    "sumPosted",
    "summarizeAccount",
  ]);
  assert.equal(calls[1][0], "accountActions");
  assert.equal(calls[1][1].repository, accountActions.repository);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "$",
    "closeModal",
    "editAccount",
    "fetchAll",
    "openPayment",
    "repository",
    "state",
    "toast",
  ]);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachAccountDetailActionEvents",
    "openAccountDetails",
  ]);
});

test("deposit workspace connects held-balance details to adjustment actions", () => {
  const calls = [];
  const depositSectionHTML = () => "deposit";
  const attachDepositAdjustmentEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDepositDetailsWorkflow: {
        create(options) {
          calls.push(["details", options]);
          return { depositSectionHTML };
        },
      },
      PropertyDeskDepositAdjustmentWorkflow: {
        create(options) {
          calls.push(["adjustments", options]);
          return { attachDepositAdjustmentEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );
  const details = {
    state: {},
    depositLedger() {},
    money() {},
    fmtDate() {},
    esc() {},
    unused: true,
  };
  const adjustments = {
    $() {},
    state: {},
    todayIso() {},
    toast() {},
    fetchAll() {},
    moneyInput() {},
    repository: {},
    prepareAdjustment() {},
    validateAdjustment() {},
    unused: true,
  };
  const workflow = context.window.PropertyDeskDepositWorkspaceWorkflow.create({
    details,
    adjustments,
  });

  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "depositLedger",
    "esc",
    "fmtDate",
    "money",
    "state",
  ]);
  assert.equal(calls[0][1].depositLedger, details.depositLedger);
  assert.equal(calls[1][1].depositSectionHTML, depositSectionHTML);
  assert.equal(calls[1][1].repository, adjustments.repository);
  assert.equal("unused" in calls[1][1], false);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachDepositAdjustmentEvents",
    "depositSectionHTML",
  ]);
  assert.equal(workflow.depositSectionHTML, depositSectionHTML);
  assert.equal(
    workflow.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
});

test("account detail content workflow composes schedule, history, and account", async () => {
  const passed = {};
  const accountLoanScheduleHTML = () => "schedule";
  const renderAccountDetails = () => "details";
  const accountHistoryHTML = () => "history";
  const accountHistory = { auditError: false };
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
      PropertyDeskAccountDetails: {
        create: (options) => {
          passed.details = options;
          return { openAccountDetails };
        },
      },
      PropertyDeskAccountHistoryModel: {
        create: (options) => {
          passed.historyModel = options;
          return { loadAccountHistory: async () => accountHistory };
        },
      },
      PropertyDeskAccountHistoryView: {
        create: (options) => {
          passed.historyView = options;
          return { accountHistoryHTML };
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
    summarizeAccount() {},
    amortizationSchedule() {},
    openModal() {},
    propertyAddress() {},
    depositSectionHTML,
    accountHistoryRepository: { loadAccountAuditEvents() {} },
  };
  const workflow =
    context.window.PropertyDeskAccountDetailContentWorkflow.create(
      dependencies,
    );

  assert.equal(passed.view.accountLoanScheduleHTML, accountLoanScheduleHTML);
  assert.equal(passed.historyModel.state, dependencies.state);
  assert.equal(
    passed.historyModel.repository,
    dependencies.accountHistoryRepository,
  );
  assert.equal(passed.historyView.esc, dependencies.esc);
  assert.equal(passed.model.state, dependencies.state);
  assert.equal(passed.model.sumPosted, dependencies.sumPosted);
  assert.equal(passed.model.summarizeAccount, dependencies.summarizeAccount);
  assert.equal(passed.details.renderAccountDetails, renderAccountDetails);
  assert.equal(typeof passed.details.buildAccountDetailData, "function");
  assert.equal(
    await passed.details.renderAccountHistory({}, []),
    accountHistoryHTML(),
  );
  assert.equal(passed.details.depositSectionHTML, depositSectionHTML);
  assert.deepEqual(Object.keys(workflow).sort(), ["openAccountDetails"]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
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
    repository: context.window.PropertyDeskAccountRepository.create({
      getClient: () => state.client,
    }),
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
    repository: context.window.PropertyDeskAccountRepository.create({
      getClient: () => ({
        from: () => ({
          update: () => ({
            eq: async () => {
              throw new Error("offline");
            },
          }),
        }),
      }),
    }),
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
      close: async (id) => {
        calls.push(["close", id]);
        return { error: { message: "Permission denied" } };
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.deepEqual(calls, [["close", "account-1"]]);
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
