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
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "app.js"),
    "utf8",
  );
  assert.match(
    appSource,
    /const makeId = \(\) => window\.crypto\.randomUUID\(\);/,
  );
  assert.match(
    appSource,
    /PropertyDeskPropertyWorkspaceSetup\.create\(\{[\s\S]*?makeId,/,
  );
  assert.match(
    appSource,
    /const browserStorage = Object\.freeze\(\{\s*getItem: \(key\) => window\.localStorage\.getItem\(key\),\s*setItem: \(key, value\) => window\.localStorage\.setItem\(key, value\),\s*\}\);/,
  );

  let received;
  const result = { renderProperties() {} };
  const workspace = {
    create(options) {
      received = options;
      return result;
    },
  };
  const editPropertyQuickNote = () => {};
  let receivedQuickNote;
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
  records.unusedRecordValue = true;
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
    "makeId",
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
    "storage",
    "promptAction",
  ];
  const ui = Object.fromEntries(uiKeys.map((key) => [key, () => key]));
  ui.unusedUiValue = true;
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
  services.propertyRepository = {
    save() {},
    updateOwned() {},
  };
  services.propertyHolderRepository = {
    clearPropertyHolders() {},
    addPropertyHolders() {},
    unusedOperation() {},
  };
  services.unusedServiceValue = true;
  const workflows = {
    workspace,
    quickNote: {
      workflow: {
        create(options) {
          receivedQuickNote = options;
          return { editPropertyQuickNote };
        },
      },
      noteMaintenance: { key: "note-maintenance" },
      recordUpdateMaintenance: { key: "record-update-maintenance" },
    },
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

  assert.equal(receivedQuickNote.getProperties, records.getProperties);
  assert.equal(
    receivedQuickNote.getWorkspaceOwnerId,
    records.getWorkspaceOwnerId,
  );
  assert.deepEqual(Object.keys(receivedQuickNote.repository), ["updateOwned"]);
  assert.equal(
    receivedQuickNote.repository.updateOwned,
    services.propertyRepository.updateOwned,
  );
  assert.equal(
    receivedQuickNote.noteMaintenance,
    workflows.quickNote.noteMaintenance,
  );
  assert.equal(
    receivedQuickNote.recordUpdateMaintenance,
    workflows.quickNote.recordUpdateMaintenance,
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
  assert.deepEqual(Object.keys(received.detail.management.propertyRepository), [
    "updateOwned",
  ]);
  assert.equal(
    received.detail.management.propertyRepository.updateOwned,
    services.propertyRepository.updateOwned,
  );
  assert.equal(received.detail.management.closeModal, services.closeModal);
  assert.deepEqual(Object.keys(received.detail.holders.repository).sort(), [
    "addPropertyHolders",
    "clearPropertyHolders",
  ]);
  assert.equal(
    received.detail.holders.repository.clearPropertyHolders,
    services.propertyHolderRepository.clearPropertyHolders,
  );
  assert.equal(
    received.detail.holders.repository.addPropertyHolders,
    services.propertyHolderRepository.addPropertyHolders,
  );
  assert.equal(
    received.detail.documents.documentRepository,
    services.documentRepository,
  );
  assert.equal(received.detail.documents.makeId, ui.makeId);
  assert.equal(received.detail.documents.modules, workflows.documentModules);
  assert.equal(
    received.detail.workflows.contentModules,
    workflows.contentModules,
  );
  assert.equal(received.overview.getPayments, records.getPayments);
  assert.equal(received.overview.workflows, workflows.overviewModules);
  assert.equal(received.portfolio.getSenderName, records.getSenderName);
  assert.equal(received.portfolio.openWindow, ui.openWindow);
  assert.equal(received.portfolio.storage, ui.storage);
  assert.equal(received.portfolio.lateReminderMailto, ui.lateReminderMailto);
  assert.equal(received.portfolio.workflows, workflows.portfolioModules);
  assert.equal(received.portfolio.editPropertyQuickNote, editPropertyQuickNote);
  assert.equal("getWorkspaceOwnerId" in received.portfolio, false);
  assert.equal("propertyRepository" in received.portfolio, false);
  for (const scope of [
    received.detail.content,
    received.detail.management,
    received.detail.holders,
    received.detail.documents,
    received.overview,
    received.portfolio,
  ]) {
    assert.equal("unusedRecordValue" in scope, false);
    assert.equal("unusedUiValue" in scope, false);
    assert.equal("unusedServiceValue" in scope, false);
  }
  assert.doesNotMatch(source, /\bstate\b/);
});
