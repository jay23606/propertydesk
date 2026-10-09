const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("account detail workspace forwards scoped content and action inputs", () => {
  const passed = {};
  const openAccountDetails = () => {};
  const attachAccountDetailActionEvents = () => {};
  const actionWorkflows = {
    closeMaintenance: { create() {} },
    closeEntry: { create() {} },
    detailEvents: { create() {} },
  };
  const content = {
    $() {},
    getAccount() {},
    getProperty() {},
    getPaymentsForAccount() {},
    getAgreementVersions() {},
    beginAuditRequest() {},
    isCurrentAuditRequest() {},
    money() {},
    fmtDate() {},
    fmtDateTime() {},
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
    workflows: {},
    unusedDependency: true,
  };
  const actions = {
    $() {},
    getAccount() {},
    getCollection() {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
    repository: {},
    saveAndRefreshWorkspaceRecord() {},
    confirmAction() {},
    unusedDependency: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountDetailActionWorkflow: {
        create(options) {
          passed.actions = options;
          return { attachAccountDetailActionEvents };
        },
      },
    },
    contentWorkflow: {
      create(options) {
        passed.content = options;
        return { openAccountDetails };
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-detail-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskAccountDetailWorkspaceWorkflow.create({
      content,
      actions,
      contentWorkflow: context.contentWorkflow,
      actionWorkflow: context.window.PropertyDeskAccountDetailActionWorkflow,
      actionWorkflows,
    });

  assert.deepEqual(Object.keys(passed.content).sort(), [
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
    "unusedDependency",
    "workflows",
  ]);
  assert.deepEqual(Object.keys(passed.actions).sort(), [
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
    "unusedDependency",
    "workflows",
  ]);
  for (const key of Object.keys(passed.content))
    assert.equal(passed.content[key], content[key]);
  for (const key of Object.keys(passed.actions))
    if (key === "workflows") assert.equal(passed.actions[key], actionWorkflows);
    else assert.equal(passed.actions[key], actions[key]);
  assert.equal("unusedDependency" in passed.content, true);
  assert.equal("unusedDependency" in passed.actions, true);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(Object.isFrozen(workflow), true);
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-detail-workspace-workflow.js",
      ),
      "utf8",
    ),
    /window\.PropertyDeskAccountDetailContentWorkflow\.create/,
  );
});
