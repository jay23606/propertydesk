const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("account and deposit workspace setup wires scoped records, UI, services, and workflows", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-deposit-workspace-setup.js",
    ),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);
  const contextSetupSource = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-deposit-context-setup.js"),
    "utf8",
  );
  vm.runInContext(contextSetupSource, context);

  let received;
  const result = { openAccountDetails() {} };
  const workspace = {
    create(options) {
      received = options;
      return result;
    },
  };
  const recordMethods = [
    "getAccount",
    "getProperty",
    "getPaymentsForAccount",
    "getAgreementVersions",
    "beginAuditRequest",
    "isCurrentAuditRequest",
    "getWorkspaceOwnerId",
    "getDepositCollection",
    "getAccountCollection",
  ];
  const records = Object.fromEntries(
    recordMethods.map((key) => [key, () => key]),
  );
  records.unusedRecordValue = true;
  const ui = Object.fromEntries(
    [
      "$",
      "money",
      "fmtDate",
      "fmtDateTime",
      "esc",
      "sumPosted",
      "prettyType",
      "paymentFrequencyLabel",
      "summarizeAccount",
      "amortizationSchedule",
      "propertyAddress",
      "todayIso",
      "toast",
      "moneyInput",
      "promptAction",
      "openModal",
      "closeModal",
      "editAccount",
      "openPayment",
      "confirmAction",
    ].map((key) => [key, () => key]),
  );
  ui.unusedUiValue = true;
  const services = Object.fromEntries(
    [
      "depositLedger",
      "fetchAll",
      "depositRepository",
      "accountHistoryRepository",
      "accountRepository",
      "saveAndRefreshWorkspaceRecord",
    ].map((key) => [key, { name: key }]),
  );
  services.depositRepository = { insert() {}, unusedDelete() {} };
  services.accountRepository = {
    save() {},
    close() {},
    unusedOperation() {},
  };
  services.unusedServiceValue = true;
  const workflows = {
    workspace,
    deposit: {
      workspace: { name: "deposit-workspace" },
      detailsModel: { name: "deposit-details-model" },
      detailsView: { name: "deposit-details-view" },
      adjustmentWorkflow: { name: "deposit-adjustment" },
      adjustmentModules: { name: "deposit-adjustment-modules" },
    },
    accountDetails: {
      workspace: { name: "account-detail-workspace" },
      content: { name: "account-detail-content" },
      action: { name: "account-detail-actions" },
      actionWorkflows: { name: "account-action-modules" },
      contentModules: { name: "account-content-modules" },
    },
    contextSetup: context.window.PropertyDeskAccountDepositContextSetup,
    adjustmentModel: {
      prepare() {},
      validate() {},
      resolveType() {},
    },
  };

  assert.equal(
    context.window.PropertyDeskAccountDepositWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );

  assert.equal(received.depositWorkspaceWorkflow, workflows.deposit.workspace);
  assert.equal(
    received.accountDetailWorkspaceWorkflow,
    workflows.accountDetails.workspace,
  );
  assert.equal(
    received.accountDetailContentWorkflow,
    workflows.accountDetails.content,
  );
  assert.equal(
    received.accountDetailActionWorkflow,
    workflows.accountDetails.action,
  );
  assert.equal(received.deposits.details.depositLedger, services.depositLedger);
  assert.deepEqual(Object.keys(received.deposits).sort(), [
    "adjustments",
    "details",
  ]);
  assert.equal(received.deposits.adjustments.getAccount, records.getAccount);
  assert.equal(
    received.deposits.adjustments.getCollection,
    records.getDepositCollection,
  );
  assert.deepEqual(Object.keys(received.deposits.adjustments.repository), [
    "insert",
  ]);
  assert.equal(
    received.deposits.adjustments.repository.insert,
    services.depositRepository.insert,
  );
  assert.equal(
    received.deposits.adjustments.prepareAdjustment,
    workflows.adjustmentModel.prepare,
  );
  assert.equal(received.accountDetails.content.getAccount, records.getAccount);
  assert.equal(
    received.accountDetails.content.getAgreementVersions,
    records.getAgreementVersions,
  );
  assert.equal(
    received.accountDetails.content.accountHistoryRepository,
    services.accountHistoryRepository,
  );
  assert.equal(
    received.accountDetails.actions.getCollection,
    records.getAccountCollection,
  );
  assert.deepEqual(Object.keys(received.accountDetails.actions.repository), [
    "close",
  ]);
  assert.equal(
    received.accountDetails.actions.repository.close,
    services.accountRepository.close,
  );
  assert.equal(received.accountDetails.actions.confirmAction, ui.confirmAction);
  assert.deepEqual(Object.keys(received.deposits.details).sort(), [
    "depositLedger",
    "esc",
    "fmtDate",
    "money",
  ]);
  assert.deepEqual(Object.keys(received.deposits.adjustments).sort(), [
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
  assert.deepEqual(Object.keys(received.accountDetails.content).sort(), [
    "$",
    "accountHistoryRepository",
    "amortizationSchedule",
    "beginAuditRequest",
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
  assert.deepEqual(Object.keys(received.accountDetails.actions).sort(), [
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
  assert.doesNotMatch(source, /\bstate\b/);

  const contextBuilder =
    context.window.PropertyDeskAccountDepositContextSetup.create({
      records,
      ui,
      services,
      workflows: {
        adjustmentModel: workflows.adjustmentModel,
        accountDetails: {
          contentModules: workflows.accountDetails.contentModules,
        },
      },
    });
  assert.deepEqual(Object.keys(contextBuilder).sort(), [
    "accountDetails",
    "deposits",
  ]);
  assert.equal(
    contextBuilder.deposits.details.depositLedger,
    services.depositLedger,
  );
  assert.equal(
    contextBuilder.deposits.adjustments.repository.insert,
    services.depositRepository.insert,
  );
  assert.equal(
    contextBuilder.accountDetails.content.getAgreementVersions,
    records.getAgreementVersions,
  );
  assert.equal(
    contextBuilder.accountDetails.actions.repository.close,
    services.accountRepository.close,
  );
  assert.equal(
    "unusedRecordValue" in contextBuilder.accountDetails.content,
    false,
  );
  assert.equal("unusedUiValue" in contextBuilder.deposits.adjustments, false);
});
