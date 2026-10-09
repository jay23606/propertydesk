const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property workspace shares detail actions across overview and grid", () => {
  const root = path.join(__dirname, "..");
  const calls = [];
  const openPropertyDetails = () => "details";
  const detailWorkflows = {
    content: { name: "content" },
    management: { name: "management" },
    holders: { name: "holders" },
    contentModules: { name: "content modules" },
    managementModules: { name: "management modules" },
    holderModules: { name: "holder modules" },
    unusedWorkflow: { name: "unused" },
    screen: null,
  };
  const detail = {
    content: {},
    management: {},
    holders: {},
    documents: {},
    workflows: detailWorkflows,
    unusedDetailValue: true,
  };
  const openPropertyPayment = () => "overview-payment";
  const openPayment = () => "grid-payment";
  const workflows = {};
  const propertyAddress = () => "address";
  const groupAccountsByProperty = () => new Map();
  const isActiveAccount = () => true;
  const lateReminderMailto = () => "reminder";
  const lateReminderSms = () => "sms";
  const editPropertyQuickNote = () => "note";
  const portfolioWorkflows = {};
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
    getProperties: () => [],
    getAccounts: () => [],
    getPayments: () => [],
    propertyAddress,
    openPropertyPayment,
    workflows,
    unusedDependency: true,
  };
  const portfolio = {
    getSenderName: () => "Jay",
    getPayments: () => [],
    getPropertyHolders: () => [],
    getProperties: () => [],
    getAccounts: () => [],
    getWorkspaceMembers: () => [],
    propertyAddress,
    lateReminderMailto,
    lateReminderSms,
    editPropertyQuickNote,
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
  detailWorkflows.screen = context.window.PropertyDeskPropertyScreenWorkflow;
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
  assert.deepEqual(Object.keys(calls[0][1].workflows).sort(), [
    "content",
    "contentModules",
    "holderModules",
    "holders",
    "management",
    "managementModules",
  ]);
  for (const key of Object.keys(calls[0][1].workflows))
    assert.equal(calls[0][1].workflows[key], detailWorkflows[key]);
  assert.equal("screen" in calls[0][1].workflows, false);
  assert.equal("unusedWorkflow" in calls[0][1].workflows, false);
  assert.equal("unusedDetailValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "content",
    "documents",
    "holders",
    "management",
    "workflows",
  ]);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "$",
    "collectedSince",
    "esc",
    "fmtDate",
    "getAccounts",
    "getPayments",
    "getProperties",
    "groupAccountsByProperty",
    "isActiveAccount",
    "isPosted",
    "money",
    "monthStart",
    "monthlyScheduledEstimate",
    "openPropertyDetails",
    "openPropertyPayment",
    "postedOnOrAfter",
    "prettyKind",
    "prettyType",
    "propertyAddress",
    "scheduledMonthlyRunRate",
    "summarizeAccount",
    "workflows",
  ]);
  assert.equal(typeof calls[1][1].getProperties, "function");
  assert.equal(typeof calls[1][1].getAccounts, "function");
  assert.equal(typeof calls[1][1].getPayments, "function");
  assert.equal(calls[1][1].groupAccountsByProperty, groupAccountsByProperty);
  assert.equal(calls[1][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[1][1].propertyAddress, propertyAddress);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[1][1].openPropertyPayment, openPropertyPayment);
  assert.equal(calls[1][1].workflows, workflows);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[2][1].getSenderName, portfolio.getSenderName);
  assert.equal(calls[2][1].getPayments, portfolio.getPayments);
  assert.equal(calls[2][1].getPropertyHolders, portfolio.getPropertyHolders);
  assert.equal(calls[2][1].getProperties, portfolio.getProperties);
  assert.equal(calls[2][1].getAccounts, portfolio.getAccounts);
  assert.equal(calls[2][1].getWorkspaceMembers, portfolio.getWorkspaceMembers);
  assert.equal(calls[2][1].groupAccountsByProperty, groupAccountsByProperty);
  assert.equal(calls[2][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[2][1].propertyAddress, propertyAddress);
  assert.equal(calls[2][1].lateReminderMailto, lateReminderMailto);
  assert.equal(calls[2][1].lateReminderSms, lateReminderSms);
  assert.equal(calls[2][1].editPropertyQuickNote, editPropertyQuickNote);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].openPayment, openPayment);
  assert.equal(calls[2][1].workflows, portfolioWorkflows);
  assert.equal("unusedDependency" in calls[2][1], false);
  assert.deepEqual(Object.keys(calls[2][1]).sort(), [
    "$",
    "amountDueSince",
    "dateOnly",
    "editAccount",
    "editPropertyQuickNote",
    "esc",
    "getAccounts",
    "getPayments",
    "getProperties",
    "getPropertyHolders",
    "getSenderName",
    "getWorkspaceMembers",
    "groupAccountsByProperty",
    "isActiveAccount",
    "lateReminderMailto",
    "lateReminderSms",
    "money",
    "monthEnd",
    "monthStart",
    "monthlyScheduledEstimate",
    "openAccountForProperty",
    "openModal",
    "openPayment",
    "openPropertyDetails",
    "paymentFrequencyLabel",
    "paymentStatusInMonth",
    "propertyAddress",
    "streetAddress",
    "summarizeAccount",
    "toast",
    "workflows",
  ]);
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
