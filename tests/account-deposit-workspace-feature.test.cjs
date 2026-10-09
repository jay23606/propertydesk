const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account and deposit workspace exposes only its supported operations", () => {
  const passed = {};
  const openAccountDetails = () => {};
  const attachAccountDetailActionEvents = () => {};
  const attachDepositAdjustmentEvents = () => {};
  const depositSectionHTML = () => "deposit";
  const saveAndRefreshWorkspaceRecord = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDepositWorkspaceWorkflow: {
        create: (options) => {
          passed.deposits = options;
          return {
            depositSectionHTML,
            attachDepositAdjustmentEvents,
            internalOperation: () => {},
          };
        },
      },
      PropertyDeskAccountDetailWorkspaceWorkflow: {
        create: (options) => {
          passed.accountDetails = options;
          return {
            openAccountDetails,
            attachAccountDetailActionEvents,
            internalOperation: () => {},
          };
        },
      },
      PropertyDeskAccountDetailActionWorkflow: { create() {} },
      PropertyDeskAccountCloseMaintenance: { create() {} },
      PropertyDeskAccountCloseEntry: { create() {} },
      PropertyDeskAccountDetailEvents: { create() {} },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-deposit-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const deposits = {
    details: {
      depositLedger: {},
      money: () => {},
      fmtDate: () => {},
      esc: () => {},
      unusedDetailValue: true,
    },
    adjustments: {
      $: () => {},
      getAccount: () => {},
      getWorkspaceOwnerId: () => {},
      getCollection: () => {},
      todayIso: () => {},
      toast: () => {},
      fetchAll: () => {},
      moneyInput: () => {},
      repository: {},
      prepareAdjustment: () => {},
      validateAdjustment: () => {},
      resolveAdjustmentType: () => {},
      promptAction: () => {},
      saveAndRefreshWorkspaceRecord,
      unusedAdjustmentValue: true,
    },
    unusedDepositValue: true,
  };
  const content = {
    $: () => {},
    getAccount: () => {},
    getProperty: () => {},
    getPaymentsForAccount: () => {},
    getAgreementVersions: () => {},
    beginAuditRequest: () => {},
    isCurrentAuditRequest: () => {},
    money: () => {},
    fmtDate: () => {},
    fmtDateTime: () => {},
    esc: () => {},
    sumPosted: () => {},
    prettyType: () => {},
    paymentFrequencyLabel: () => {},
    summarizeAccount: () => {},
    amortizationSchedule: () => {},
    openModal: () => {},
    propertyAddress: () => {},
    accountHistoryRepository: {},
    unusedContentValue: true,
  };
  const actions = {
    $: () => {},
    getAccount: () => {},
    getCollection: () => {},
    toast: () => {},
    fetchAll: () => {},
    closeModal: () => {},
    editAccount: () => {},
    openPayment: () => {},
    repository: {},
    saveAndRefreshWorkspaceRecord,
    unusedActionValue: true,
  };
  const accountDetails = { content, actions };
  const workspace =
    context.window.PropertyDeskAccountDepositWorkspaceWorkflow.create({
      depositWorkspaceWorkflow:
        context.window.PropertyDeskDepositWorkspaceWorkflow,
      accountDetailWorkspaceWorkflow:
        context.window.PropertyDeskAccountDetailWorkspaceWorkflow,
      accountDetailActionWorkflow:
        context.window.PropertyDeskAccountDetailActionWorkflow,
      accountDetailActionWorkflows: {
        closeMaintenance: context.window.PropertyDeskAccountCloseMaintenance,
        closeEntry: context.window.PropertyDeskAccountCloseEntry,
        detailEvents: context.window.PropertyDeskAccountDetailEvents,
      },
      depositWorkflows: {},
      deposits,
      accountDetails,
    });

  assert.equal(Object.isFrozen(workspace), true);
  assert.deepEqual(Object.keys(workspace).sort(), [
    "attachAccountDetailActionEvents",
    "attachDepositAdjustmentEvents",
    "openAccountDetails",
  ]);
  assert.deepEqual(Object.keys(passed.deposits.details).sort(), [
    "depositLedger",
    "esc",
    "fmtDate",
    "money",
  ]);
  assert.deepEqual(Object.keys(passed.deposits.adjustments).sort(), [
    "$",
    "fetchAll",
    "getAccount",
    "getCollection",
    "getWorkspaceOwnerId",
    "moneyInput",
    "prepareAdjustment",
    "promptAction",
    "repository",
    "resolveAdjustmentType",
    "saveAndRefreshWorkspaceRecord",
    "toast",
    "todayIso",
    "validateAdjustment",
  ]);
  for (const key of Object.keys(passed.deposits.details))
    assert.equal(passed.deposits.details[key], deposits.details[key]);
  for (const key of Object.keys(passed.deposits.adjustments))
    assert.equal(passed.deposits.adjustments[key], deposits.adjustments[key]);
  assert.equal("unusedDetailValue" in passed.deposits.details, false);
  assert.equal("unusedAdjustmentValue" in passed.deposits.adjustments, false);
  assert.equal("unusedDepositValue" in passed.deposits, false);
  assert.deepEqual(Object.keys(passed.accountDetails.content).sort(), [
    "$",
    "accountHistoryRepository",
    "amortizationSchedule",
    "beginAuditRequest",
    "depositSectionHTML",
    "esc",
    "fmtDate",
    "fmtDateTime",
    "getAccount",
    "getAgreementVersions",
    "getPaymentsForAccount",
    "getProperty",
    "isCurrentAuditRequest",
    "money",
    "openModal",
    "paymentFrequencyLabel",
    "prettyType",
    "propertyAddress",
    "sumPosted",
    "summarizeAccount",
    "workflows",
  ]);
  assert.equal("unusedContentValue" in passed.accountDetails.content, false);
  for (const key of Object.keys(content)) {
    if (key === "unusedContentValue") continue;
    assert.equal(passed.accountDetails.content[key], content[key]);
  }
  assert.equal(
    passed.accountDetails.content.depositSectionHTML,
    depositSectionHTML,
  );
  assert.deepEqual(Object.keys(passed.accountDetails.actions).sort(), [
    "$",
    "closeModal",
    "confirmAction",
    "editAccount",
    "fetchAll",
    "getAccount",
    "getCollection",
    "openPayment",
    "repository",
    "saveAndRefreshWorkspaceRecord",
    "toast",
  ]);
  for (const key of Object.keys(passed.accountDetails.actions))
    assert.equal(passed.accountDetails.actions[key], actions[key]);
  assert.equal("unusedActionValue" in passed.accountDetails.actions, false);
  assert.equal(
    passed.accountDetails.actions.saveAndRefreshWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
  );
  assert.equal(workspace.openAccountDetails, openAccountDetails);
  assert.equal(
    workspace.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(
    workspace.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
});

test("account and deposit workspaces connect at one feature boundary", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const appServices = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-services.js"),
    "utf8",
  );
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const transactionComposition = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  const transactionMaintenance = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "transaction-maintenance-workflow.js",
    ),
    "utf8",
  );
  const setup = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-deposit-workspace-setup.js",
    ),
    "utf8",
  );
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:DepositWorkspace|AccountDetailWorkspace)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetail(?:Content|Action)Workflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountScreenWorkflow/);
  assert.doesNotMatch(app, /PropertyDeskDepositDetails(?:Model|View)\.create/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  const accountDetailWorkflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-detail-content-workflow.js",
    ),
    "utf8",
  );
  assert.match(
    accountDetailWorkflow,
    /workflows\.accountHistoryModel\.create\(/,
  );
  assert.match(
    accountDetailWorkflow,
    /depositSectionHTML,\s*renderAccountHistory,/,
  );
  assert.doesNotMatch(accountDetailWorkflow, /AccountDetailActionWorkflow/);
  const accountWorkspaceWorkflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-detail-workspace-workflow.js",
    ),
    "utf8",
  );
  assert.match(
    accountWorkspaceWorkflow,
    /contentWorkflow\.create\(\{[\s\S]*?accountHistoryRepository: content\.accountHistoryRepository,[\s\S]*?workflows: content\.workflows,[\s\S]*?actionWorkflow\.create\(\{[\s\S]*?repository: actions\.repository,/,
  );
  assert.doesNotMatch(
    accountWorkspaceWorkflow,
    /window\.PropertyDeskAccountDetailContentWorkflow\.create/,
  );
  const accountDepositWorkspaceWorkflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-deposit-workspace-workflow.js",
    ),
    "utf8",
  );
  assert.match(
    accountDepositWorkspaceWorkflow,
    /depositWorkspaceWorkflow\.create\([\s\S]*?details: \{[\s\S]*?depositLedger: deposits\.details\.depositLedger,[\s\S]*?adjustments: \{[\s\S]*?resolveAdjustmentType: deposits\.adjustments\.resolveAdjustmentType,[\s\S]*?workflows: depositWorkflows,[\s\S]*?accountDetailWorkspaceWorkflow\.create\([\s\S]*?contentWorkflow: accountDetailContentWorkflow,[\s\S]*?depositSectionHTML: depositWorkspace\.depositSectionHTML/,
  );
  assert.doesNotMatch(
    accountDepositWorkspaceWorkflow,
    /window\.PropertyDesk(?:DepositWorkspace|AccountDetailWorkspace)Workflow/,
  );
  const depositWorkspaceWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "deposit-workspace-workflow.js"),
    "utf8",
  );
  assert.match(depositWorkspaceWorkflow, /workflows\.detailsModel\.create\(/);
  assert.match(depositWorkspaceWorkflow, /workflows\.detailsView\.create\(/);
  assert.match(depositWorkspaceWorkflow, /buildDepositDetails\(account\)/);
  assert.match(
    depositWorkspaceWorkflow,
    /workflows\.adjustmentWorkflow\.create\([\s\S]*?depositSectionHTML,/,
  );
  const accountWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-detail-action-workflow.js"),
    "utf8",
  );
  assert.match(accountWorkflow, /closeMaintenanceWorkflow\.create\(/);
  assert.match(accountWorkflow, /closeEntryWorkflow\.create\(/);
  assert.match(accountWorkflow, /detailEventsWorkflow\.create\(/);
  assert.doesNotMatch(accountWorkflow, /writeFeedback/);
  assert.match(
    accountWorkflow,
    /closeAccountDetails: \(\) => closeModal\(\$\("detail-modal"\)\)/,
  );
  assert.match(accountWorkflow, /repository,/);
  assert.match(accountWorkflow, /saveAndRefreshWorkspaceRecord,/);
  const depositWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "deposit-adjustment-workflow.js"),
    "utf8",
  );
  for (const feature of [
    "workflows.maintenance",
    "workflows.entry",
    "workflows.events",
  ])
    assert.match(depositWorkflow, new RegExp(`${feature}\\.create\\(`));
  assert.doesNotMatch(
    depositWorkflow,
    /window\.PropertyDeskDeposit(?:Maintenance|AdjustmentEntry|DetailEvents)\.create/,
  );
  assert.match(depositWorkflow, /repository,/);
  assert.match(depositWorkflow, /saveAndRefreshWorkspaceRecord,/);
  assert.doesNotMatch(depositWorkflow, /writeFeedback/);
  assert.match(
    setup,
    /adjustments: \{[\s\S]*?repository: services\.depositRepository,[\s\S]*?saveAndRefreshWorkspaceRecord:/,
  );
  assert.match(
    setup,
    /actions: \{[\s\S]*?repository: services\.accountRepository,[\s\S]*?saveAndRefreshWorkspaceRecord:/,
  );
  assert.match(
    appServices,
    /modules\.writeFeedback\.factory\.create\(\{[\s\S]*?reconciliation: modules\.writeFeedback\.reconciliation,[\s\S]*?recordWrites: modules\.writeFeedback\.recordWrites/,
  );
  assert.match(app, /transactionRepository: repositories\.transactions/);
  assert.match(
    transactionComposition,
    /resolveVoidTarget: workflows\.voidModel\.resolveVoidTarget/,
  );
  assert.match(
    transactionComposition,
    /buildVoidPayload: workflows\.voidModel\.buildVoidPayload/,
  );
  assert.match(
    transactionComposition,
    /records: \{[\s\S]*?getPayments: records\.getPayments,[\s\S]*?getExpenses: records\.getExpenses,[\s\S]*?getAccounts: records\.getAccounts/,
  );
  assert.match(
    transactionComposition,
    /workflows: \{[\s\S]*?correctionModel: workflows\.correctionModel/,
  );
  assert.match(
    transactionMaintenance,
    /correctionModelWorkflow\.create\(\{[\s\S]*?getPayments,[\s\S]*?getExpenses,[\s\S]*?getAccounts/,
  );
  assert.match(
    transactionMaintenance,
    /findCorrectionTarget: correctionModel\.findCorrectionTarget/,
  );
  assert.match(app, /accountRepository: repositories\.accounts/);
  assert.match(app, /depositRepository: repositories\.deposits/);
  assert.match(app, /action: window\.PropertyDeskAccountDetailActionWorkflow/);
  assert.match(
    app,
    /content: window\.PropertyDeskAccountDetailContentWorkflow/,
  );
  assert.match(setup, /prepareAdjustment: workflows\.adjustmentModel\.prepare/);
  assert.match(
    setup,
    /validateAdjustment: workflows\.adjustmentModel\.validate/,
  );
  assert.match(
    setup,
    /resolveAdjustmentType: workflows\.adjustmentModel\.resolveType/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountHistoryDetails\.create\(/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );
  assert.match(
    setup,
    /workflows\.workspace\.create\([\s\S]*?deposits: \{[\s\S]*?accountDetails: \{[\s\S]*?accountHistoryRepository: services\.accountHistoryRepository/,
  );
  assert.doesNotMatch(setup, /\bstate\b/);
  assert.match(html, /features\/account-deposit-workspace-workflow\.js/);
  assert.match(
    worker,
    /'\.\/features\/account-deposit-workspace-workflow\.js'/,
  );
  assert.match(html, /features\/account-deposit-workspace-setup\.js/);
  assert.match(worker, /'\.\/features\/account-deposit-workspace-setup\.js'/);
  assert.doesNotMatch(app, /PropertyDeskAccountDetailsWorkflow\.create\(/);
});

test("account, deposit, and transaction persistence receive only record getters", () => {
  const root = path.join(__dirname, "..");
  const scopedModules = [
    "features/account-deposit-workspace-workflow.js",
    "features/account-detail-action-workflow.js",
    "features/account-detail-events.js",
    "features/account-close-maintenance.js",
    "features/deposit-workspace-workflow.js",
    "features/deposit-adjustment-workflow.js",
    "features/deposit-adjustment-entry.js",
    "features/deposit-detail-events.js",
    "features/deposit-maintenance.js",
    "features/workspace-record-write-workflow.js",
    "features/transaction-inserts.js",
    "features/transaction-workspace-workflow.js",
  ];

  for (const filename of scopedModules) {
    const source = fs.readFileSync(path.join(root, filename), "utf8");
    assert.doesNotMatch(source, /\bstate\b/, filename);
  }
  assert.match(
    fs.readFileSync(
      path.join(root, "features/workspace-record-write-workflow.js"),
      "utf8",
    ),
    /getCollection\?\.\(collection\)/,
  );
});

test("deposit workspace connects held-balance details to adjustment actions", () => {
  const calls = [];
  const buildDepositDetails = (account) => ({ account });
  const renderDepositDetails = (details) => {
    calls.push(["render", details]);
    return "deposit";
  };
  const attachDepositAdjustmentEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDepositDetailsModel: {
        create(options) {
          calls.push(["detailsModel", options]);
          return { buildDepositDetails };
        },
      },
      PropertyDeskDepositDetailsView: {
        create(options) {
          calls.push(["detailsView", options]);
          return { depositSectionHTML: renderDepositDetails };
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
    resolveAdjustmentType() {},
    unused: true,
  };
  const workflow = context.window.PropertyDeskDepositWorkspaceWorkflow.create({
    details,
    adjustments,
    workflows: {
      detailsModel: context.window.PropertyDeskDepositDetailsModel,
      detailsView: context.window.PropertyDeskDepositDetailsView,
      adjustmentWorkflow: context.window.PropertyDeskDepositAdjustmentWorkflow,
    },
  });

  assert.equal(Object.isFrozen(workflow), true);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), ["depositLedger"]);
  assert.equal(calls[0][1].depositLedger, details.depositLedger);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "esc",
    "fmtDate",
    "money",
  ]);
  assert.equal(calls[1][1].money, details.money);
  assert.equal(calls[2][1].depositSectionHTML, workflow.depositSectionHTML);
  assert.equal(calls[2][1].repository, adjustments.repository);
  assert.equal(
    calls[2][1].resolveAdjustmentType,
    adjustments.resolveAdjustmentType,
  );
  assert.equal("unused" in calls[2][1], false);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachDepositAdjustmentEvents",
    "depositSectionHTML",
  ]);
  assert.equal(workflow.depositSectionHTML({ id: "rental-1" }), "deposit");
  assert.deepEqual(calls[3], ["render", { account: { id: "rental-1" } }]);
  assert.equal(
    workflow.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
});
