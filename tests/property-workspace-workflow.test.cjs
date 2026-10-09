const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property workspace shares detail actions across overview and grid", () => {
  const root = path.join(__dirname, "..");
  const calls = [];
  const openPropertyDetails = () => "details";
  const detail = {
    content: {},
    management: {},
    holders: {},
    documents: {},
    workflows: {},
    unusedDetailValue: true,
  };
  const openPropertyPayment = () => "overview-payment";
  const openPayment = () => "grid-payment";
  const state = {};
  const workflows = {};
  const propertyAddress = () => "address";
  const groupAccountsByProperty = () => new Map();
  const isActiveAccount = () => true;
  const lateReminderMailto = () => "reminder";
  const lateReminderSms = () => "sms";
  const promptAction = () => "note";
  const portfolioWorkflows = {};
  const saveAndRefreshWorkspaceRecord = () => {};
  const overviewWorkflow = {
    create(options) {
      calls.push(["overview", options]);
      return { renderOverview() {}, attachOverviewEvents() {} };
    },
  };
  const portfolioWorkflow = {
    create(options) {
      calls.push(["portfolio", options]);
      return {
        renderProperties() {},
        attachPropertyGridEvents() {},
        attachPropertyActionEvents() {},
      };
    },
  };
  const overview = {
    state,
    propertyAddress,
    openPropertyPayment,
    workflows,
    unusedDependency: true,
  };
  const portfolio = {
    state,
    propertyAddress,
    lateReminderMailto,
    lateReminderSms,
    saveAndRefreshWorkspaceRecord,
    promptAction,
    openPayment,
    workflows: portfolioWorkflows,
    unusedDependency: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyScreenWorkflow: {
        create(options) {
          calls.push(["detail", options]);
          return {
            openPropertyDetails,
            attachPropertyDetailEvents() {},
            attachPropertyQuickActionEvents() {},
            attachPropertyHolderEvents() {},
            attachPropertyDocumentEvents() {},
          };
        },
      },
    },
  });
  detail.workflows.screen = context.window.PropertyDeskPropertyScreenWorkflow;
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "property-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workspace = context.window.PropertyDeskPropertyWorkspaceWorkflow.create(
    {
      detail,
      overview,
      portfolio,
      groupAccountsByProperty,
      isActiveAccount,
      workflows: {
        overview: overviewWorkflow,
        portfolio: portfolioWorkflow,
      },
    },
  );

  assert.deepEqual(
    calls.map(([name]) => name),
    ["detail", "overview", "portfolio"],
  );
  assert.equal(calls[0][1].content, detail.content);
  assert.equal(calls[0][1].management, detail.management);
  assert.equal(calls[0][1].holders, detail.holders);
  assert.equal(calls[0][1].documents, detail.documents);
  assert.equal("unusedDetailValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "content",
    "documents",
    "holders",
    "management",
    "workflows",
  ]);
  assert.equal(calls[1][1].state, state);
  assert.equal(calls[1][1].groupAccountsByProperty, groupAccountsByProperty);
  assert.equal(calls[1][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[1][1].propertyAddress, propertyAddress);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[1][1].openPropertyPayment, openPropertyPayment);
  assert.equal(calls[1][1].workflows, workflows);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[2][1].state, state);
  assert.equal(calls[2][1].groupAccountsByProperty, groupAccountsByProperty);
  assert.equal(calls[2][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[2][1].propertyAddress, propertyAddress);
  assert.equal(calls[2][1].lateReminderMailto, lateReminderMailto);
  assert.equal(calls[2][1].lateReminderSms, lateReminderSms);
  assert.equal(
    calls[2][1].saveAndRefreshWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
  );
  assert.equal(calls[2][1].promptAction, promptAction);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].openPayment, openPayment);
  assert.equal(calls[2][1].workflows, portfolioWorkflows);
  assert.equal("unusedDependency" in calls[2][1], false);
  assert.equal(workspace.openPropertyDetails, openPropertyDetails);
  assert.equal(Object.isFrozen(workspace), true);
  assert.deepEqual(Object.keys(workspace).sort(), [
    "attachOverviewEvents",
    "attachPropertyActionEvents",
    "attachPropertyDetailEvents",
    "attachPropertyDocumentEvents",
    "attachPropertyGridEvents",
    "attachPropertyHolderEvents",
    "attachPropertyQuickActionEvents",
    "openPropertyDetails",
    "renderOverview",
    "renderProperties",
  ]);
});
