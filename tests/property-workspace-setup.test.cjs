const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property workspace setup wires detail, overview, and portfolio dependencies", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-workspace-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = { renderProperties() {} };
  const workspace = {
    create(options) {
      received = options;
      return result;
    },
  };
  const recordKeys = [
    "beginAuditRequest",
    "setSelectedPropertyId",
    "getSelectedPropertyId",
    "getPayments",
    "getExpenses",
    "getProperties",
    "getAccounts",
    "getDocuments",
    "getWorkspaceMembers",
    "getPropertyHolders",
    "getWorkspaceOwnerId",
    "getSenderName",
  ];
  const records = Object.fromEntries(recordKeys.map((key) => [key, () => key]));
  const uiKeys = [
    "$",
    "isPosted",
    "sumIncome",
    "sumOperatingExpenses",
    "money",
    "fmtDate",
    "esc",
    "prettyType",
    "paymentFrequencyLabel",
    "accountBalance",
    "openModal",
    "propertyAddress",
    "toast",
    "todayIso",
    "confirmAction",
    "openWindow",
    "monthlyScheduledEstimate",
    "summarizeAccount",
    "collectedSince",
    "scheduledMonthlyRunRate",
    "monthStart",
    "postedOnOrAfter",
    "prettyKind",
    "streetAddress",
    "amountDueSince",
    "dateOnly",
    "monthEnd",
    "lateReminderMailto",
    "lateReminderSms",
    "paymentStatusInMonth",
    "promptAction",
  ];
  const ui = Object.fromEntries(uiKeys.map((key) => [key, () => key]));
  const serviceKeys = [
    "fetchAll",
    "propertyRepository",
    "propertyHolderRepository",
    "documentRepository",
    "saveAndRefreshWorkspaceRecord",
    "reconcileWorkspaceChange",
    "refreshWorkspace",
    "closeModal",
    "editAccount",
    "openAccountDetails",
    "openPayment",
    "openExpense",
    "openAccountForProperty",
    "openPropertyPayment",
  ];
  const services = Object.fromEntries(serviceKeys.map((key) => [key, { key }]));
  const workflows = {
    workspace,
    groupAccountsByProperty: { key: "property-index" },
    isActiveAccount: { key: "active-account" },
    overview: { key: "overview-workflow" },
    portfolio: { key: "portfolio-workflow" },
    documentWorkflow: { key: "document-workflow" },
    documents: { key: "documents" },
    documentEvents: { key: "document-events" },
    screen: { key: "property-screen" },
    content: { key: "property-content" },
    management: { key: "property-management" },
    holder: { key: "property-holders" },
    contentModules: { key: "content-modules" },
    managementModules: { key: "management-modules" },
    holderModules: { key: "holder-modules" },
    documentModules: { key: "document-modules" },
    overviewModules: { key: "overview-modules" },
    portfolioModules: { key: "portfolio-modules" },
  };

  assert.equal(
    context.window.PropertyDeskPropertyWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );

  assert.equal(
    received.groupAccountsByProperty,
    workflows.groupAccountsByProperty,
  );
  assert.equal(received.isActiveAccount, workflows.isActiveAccount);
  assert.equal(received.detail.content.getPayments, records.getPayments);
  assert.equal(
    received.detail.content.beginAuditRequest,
    records.beginAuditRequest,
  );
  assert.equal(
    received.detail.management.getSelectedPropertyId,
    records.getSelectedPropertyId,
  );
  assert.equal(
    received.detail.management.propertyRepository,
    services.propertyRepository,
  );
  assert.equal(
    received.detail.holders.repository,
    services.propertyHolderRepository,
  );
  assert.equal(
    received.detail.documents.documentRepository,
    services.documentRepository,
  );
  assert.equal(received.detail.documents.modules, workflows.documentModules);
  assert.equal(
    received.detail.workflows.contentModules,
    workflows.contentModules,
  );
  assert.equal(received.overview.getPayments, records.getPayments);
  assert.equal(received.overview.workflows, workflows.overviewModules);
  assert.equal(received.portfolio.getSenderName, records.getSenderName);
  assert.equal(received.portfolio.lateReminderMailto, ui.lateReminderMailto);
  assert.equal(
    received.portfolio.propertyRepository,
    services.propertyRepository,
  );
  assert.equal(received.portfolio.workflows, workflows.portfolioModules);
  assert.doesNotMatch(source, /\bstate\b/);
});
