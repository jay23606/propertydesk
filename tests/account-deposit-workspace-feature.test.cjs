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
  const deposits = { detailOptions: {} };
  const content = {
    $: () => {},
    state: {},
    money: () => {},
    fmtDate: () => {},
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
  const accountDetails = { content, actions: {} };
  const workspace =
    context.window.PropertyDeskAccountDepositWorkspaceWorkflow.create({
      deposits,
      accountDetails,
    });

  assert.equal(Object.isFrozen(workspace), true);
  assert.deepEqual(Object.keys(workspace).sort(), [
    "attachAccountDetailActionEvents",
    "attachDepositAdjustmentEvents",
    "openAccountDetails",
  ]);
  assert.equal(passed.deposits, deposits);
  assert.deepEqual(Object.keys(passed.accountDetails.content).sort(), [
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
  assert.equal("unusedContentValue" in passed.accountDetails.content, false);
  for (const key of Object.keys(content)) {
    if (key === "unusedContentValue") continue;
    assert.equal(passed.accountDetails.content[key], content[key]);
  }
  assert.equal(
    passed.accountDetails.content.depositSectionHTML,
    depositSectionHTML,
  );
  assert.equal(passed.accountDetails.actions, accountDetails.actions);
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
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create\(/);
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
  const accountDetailWorkflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-detail-content-workflow.js",
    ),
    "utf8",
  );
  assert.match(accountDetailWorkflow, /AccountHistoryModel\.create\(/);
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
    /PropertyDeskAccountDetailContentWorkflow\.create\(\{[\s\S]*?accountHistoryRepository: content\.accountHistoryRepository,[\s\S]*?PropertyDeskAccountDetailActionWorkflow\.create\(\{[\s\S]*?repository: actions\.repository,/,
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
    /PropertyDeskDepositWorkspaceWorkflow\.create\(deposits\)[\s\S]*?PropertyDeskAccountDetailWorkspaceWorkflow\.create\([\s\S]*?depositSectionHTML: depositWorkspace\.depositSectionHTML/,
  );
  const depositWorkspaceWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "deposit-workspace-workflow.js"),
    "utf8",
  );
  assert.match(
    depositWorkspaceWorkflow,
    /PropertyDeskDepositDetailsModel\.create\(/,
  );
  assert.match(
    depositWorkspaceWorkflow,
    /PropertyDeskDepositDetailsView\.create\(/,
  );
  assert.match(depositWorkspaceWorkflow, /buildDepositDetails\(account\)/);
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
    /eventBindersBeforeAuth:[\s\S]*?attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDepositWorkspaceWorkflow\.create\([\s\S]*?deposits: \{[\s\S]*?accountDetails: \{[\s\S]*?accountHistoryRepository: repositories\.accountHistory/,
  );
  assert.match(html, /features\/account-deposit-workspace-workflow\.js/);
  assert.match(
    worker,
    /'\.\/features\/account-deposit-workspace-workflow\.js'/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountDetailsWorkflow\.create\(/);
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
    unused: true,
  };
  const workflow = context.window.PropertyDeskDepositWorkspaceWorkflow.create({
    details,
    adjustments,
  });

  assert.equal(Object.isFrozen(workflow), true);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), ["depositLedger", "state"]);
  assert.equal(calls[0][1].depositLedger, details.depositLedger);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "esc",
    "fmtDate",
    "money",
  ]);
  assert.equal(calls[1][1].money, details.money);
  assert.equal(calls[2][1].depositSectionHTML, workflow.depositSectionHTML);
  assert.equal(calls[2][1].repository, adjustments.repository);
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
