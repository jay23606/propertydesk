const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property screen workflow passes detail actions to management and returns both", () => {
  const calls = [];
  const openPropertyDetails = () => "details";
  const content = {
    $() {},
    beginAuditRequest() {},
    setSelectedPropertyId() {},
    getPayments() {},
    getExpenses() {},
    getProperties() {},
    getAccounts() {},
    getDocuments() {},
    getWorkspaceMembers() {},
    getPropertyHolders() {},
    isPosted() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    money() {},
    fmtDate() {},
    esc() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    openModal() {},
    propertyAddress() {},
    unusedContentValue: true,
  };
  const management = {
    closeModal() {},
    toast() {},
    saveAndRefreshWorkspaceRecord() {},
    unusedDependency: true,
  };
  const holders = {
    $() {},
    getSelectedPropertyId() {},
    getWorkspaceOwnerId() {},
    getPropertyHolders() {},
    toast() {},
    fetchAll() {},
    repository: { kind: "holder-repository" },
    reconcileWorkspaceChange() {},
    refreshWorkspace() {},
    unusedDependency: true,
  };
  const documents = {
    $() {},
    getSelectedPropertyId() {},
    getWorkspaceOwnerId() {},
    getDocuments() {},
    toast() {},
    fetchAll() {},
    documentRepository: { kind: "document-repository" },
    refreshWorkspace() {},
    confirm: () => true,
    openWindow: () => null,
    modules: { kind: "document-modules" },
    unusedDependency: true,
  };
  const attachPropertyDocumentEvents = () => {};
  const attachPropertyHolderEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyDetailContentWorkflow: {
        create(options) {
          calls.push(["content", options]);
          return { openPropertyDetails };
        },
      },
      PropertyDeskPropertyDetailManagementWorkflow: {
        create(options) {
          calls.push(["management", options]);
          return {
            attachPropertyDetailEvents() {},
            attachPropertyQuickActionEvents() {},
          };
        },
      },
      PropertyDeskPropertyDocumentWorkflow: {
        create(options) {
          calls.push(["propertyDocuments", options]);
          return { attachPropertyDocumentEvents };
        },
      },
      PropertyDeskPropertyHolderWorkflow: {
        create(options) {
          calls.push(["propertyHolders", options]);
          return { attachPropertyHolderEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-screen-workflow.js"),
      "utf8",
    ),
    context,
  );
  documents.workflow = context.window.PropertyDeskPropertyDocumentWorkflow;
  documents.documentsWorkflow = { create() {} };
  documents.documentEventsWorkflow = { create() {} };
  const propertyScreenWorkflows = {
    content: context.window.PropertyDeskPropertyDetailContentWorkflow,
    management: context.window.PropertyDeskPropertyDetailManagementWorkflow,
    holders: context.window.PropertyDeskPropertyHolderWorkflow,
    contentModules: {
      documentsView: context.window.PropertyDeskPropertyDocumentsView,
      accountTable: context.window.PropertyDeskPropertyDetailsAccountTable,
      detailsView: context.window.PropertyDeskPropertyDetailsView,
      activityDetails: context.window.PropertyDeskPropertyActivityDetails,
      detailsModel: context.window.PropertyDeskPropertyDetailsModel,
      details: context.window.PropertyDeskPropertyDetails,
    },
    managementModules: {
      archive: context.window.PropertyDeskPropertyArchive,
      statusMaintenance: context.window.PropertyDeskPropertyStatusMaintenance,
      recordUpdateMaintenance:
        context.window.PropertyDeskPropertyRecordUpdateMaintenance,
      detailEvents: context.window.PropertyDeskPropertyDetailEvents,
      quickActions: context.window.PropertyDeskPropertyDetailQuickActions,
    },
    holderModules: {
      management: context.window.PropertyDeskPropertyHolderManagement,
      events: context.window.PropertyDeskPropertyHolderEvents,
    },
  };

  const workflow = context.window.PropertyDeskPropertyScreenWorkflow.create({
    content,
    management,
    holders,
    documents,
    workflows: propertyScreenWorkflows,
  });

  assert.equal(calls[0][0], "content");
  assert.equal(calls[0][1].beginAuditRequest, content.beginAuditRequest);
  assert.equal(
    calls[0][1].setSelectedPropertyId,
    content.setSelectedPropertyId,
  );
  assert.equal(calls[0][1].getPayments, content.getPayments);
  assert.equal(calls[0][1].getExpenses, content.getExpenses);
  assert.equal(calls[0][1].getProperties, content.getProperties);
  assert.equal(calls[0][1].getAccounts, content.getAccounts);
  assert.equal(calls[0][1].getDocuments, content.getDocuments);
  assert.equal(calls[0][1].getWorkspaceMembers, content.getWorkspaceMembers);
  assert.equal(calls[0][1].getPropertyHolders, content.getPropertyHolders);
  assert.equal(calls[0][1].isPosted, content.isPosted);
  assert.equal(calls[0][1].propertyAddress, content.propertyAddress);
  assert.equal(calls[0][1].workflows, propertyScreenWorkflows.contentModules);
  assert.equal("unusedContentValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "$",
    "accountBalance",
    "beginAuditRequest",
    "esc",
    "fmtDate",
    "getAccounts",
    "getDocuments",
    "getExpenses",
    "getPayments",
    "getProperties",
    "getPropertyHolders",
    "getWorkspaceMembers",
    "isPosted",
    "money",
    "openModal",
    "paymentFrequencyLabel",
    "prettyType",
    "propertyAddress",
    "setSelectedPropertyId",
    "sumIncome",
    "sumOperatingExpenses",
    "workflows",
  ]);
  assert.equal(calls[1][0], "management");
  assert.equal(calls[1][1].closeModal, management.closeModal);
  assert.equal(calls[1][1].toast, management.toast);
  assert.equal(
    calls[1][1].saveAndRefreshWorkspaceRecord,
    management.saveAndRefreshWorkspaceRecord,
  );
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal("propertyHolderRepository" in calls[1][1], false);
  assert.equal("documentRepository" in calls[1][1], false);
  assert.equal(calls[2][0], "propertyHolders");
  assert.equal(
    calls[2][1].getSelectedPropertyId,
    holders.getSelectedPropertyId,
  );
  assert.equal(calls[2][1].getWorkspaceOwnerId, holders.getWorkspaceOwnerId);
  assert.equal(calls[2][1].getPropertyHolders, holders.getPropertyHolders);
  assert.equal(calls[2][1].repository, holders.repository);
  assert.equal(
    calls[2][1].reconcileWorkspaceChange,
    holders.reconcileWorkspaceChange,
  );
  assert.equal(calls[2][1].refreshWorkspace, holders.refreshWorkspace);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].$, holders.$);
  assert.equal(calls[2][1].toast, holders.toast);
  assert.equal(calls[2][1].fetchAll, holders.fetchAll);
  assert.equal(calls[3][0], "propertyDocuments");
  assert.equal(calls[3][1].repository, documents.documentRepository);
  assert.equal(calls[3][1].refreshWorkspace, documents.refreshWorkspace);
  assert.equal(calls[3][1].confirm, documents.confirm);
  assert.equal(calls[3][1].openWindow, documents.openWindow);
  assert.equal(calls[3][1].modules, documents.modules);
  assert.equal(calls[3][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[3][1].$, documents.$);
  assert.equal(
    calls[3][1].getSelectedPropertyId,
    documents.getSelectedPropertyId,
  );
  assert.equal(calls[3][1].getWorkspaceOwnerId, documents.getWorkspaceOwnerId);
  assert.equal(calls[3][1].getDocuments, documents.getDocuments);
  assert.equal(calls[3][1].toast, documents.toast);
  assert.equal(calls[3][1].fetchAll, documents.fetchAll);
  assert.equal(calls[3][1].documentsWorkflow, documents.documentsWorkflow);
  assert.equal(
    calls[3][1].documentEventsWorkflow,
    documents.documentEventsWorkflow,
  );
  assert.equal(workflow.openPropertyDetails, openPropertyDetails);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachPropertyDetailEvents",
    "attachPropertyDocumentEvents",
    "attachPropertyHolderEvents",
    "attachPropertyQuickActionEvents",
    "openPropertyDetails",
  ]);
  assert.equal(
    workflow.attachPropertyDocumentEvents,
    attachPropertyDocumentEvents,
  );
  assert.equal(workflow.attachPropertyHolderEvents, attachPropertyHolderEvents);
});
