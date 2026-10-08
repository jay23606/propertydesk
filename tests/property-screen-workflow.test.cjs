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
    state: {},
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
    unusedDependency: true,
  };
  const holders = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    repository: { kind: "holder-repository" },
    unusedDependency: true,
  };
  const documents = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    documentRepository: { kind: "document-repository" },
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

  const workflow = context.window.PropertyDeskPropertyScreenWorkflow.create({
    content,
    management,
    holders,
    documents,
    workflows: {
      content: context.window.PropertyDeskPropertyDetailContentWorkflow,
      management: context.window.PropertyDeskPropertyDetailManagementWorkflow,
      holders: context.window.PropertyDeskPropertyHolderWorkflow,
    },
  });

  assert.equal(calls[0][0], "content");
  assert.equal(calls[0][1].state, content.state);
  assert.equal(calls[0][1].isPosted, content.isPosted);
  assert.equal(calls[0][1].propertyAddress, content.propertyAddress);
  assert.equal("unusedContentValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "$",
    "accountBalance",
    "esc",
    "fmtDate",
    "isPosted",
    "money",
    "openModal",
    "paymentFrequencyLabel",
    "prettyType",
    "propertyAddress",
    "state",
    "sumIncome",
    "sumOperatingExpenses",
  ]);
  assert.equal(calls[1][0], "management");
  assert.equal(calls[1][1].closeModal, management.closeModal);
  assert.equal(calls[1][1].toast, management.toast);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal("propertyHolderRepository" in calls[1][1], false);
  assert.equal("documentRepository" in calls[1][1], false);
  assert.equal(calls[2][0], "propertyHolders");
  assert.equal(calls[2][1].state, holders.state);
  assert.equal(calls[2][1].repository, holders.repository);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].$, holders.$);
  assert.equal(calls[2][1].toast, holders.toast);
  assert.equal(calls[2][1].fetchAll, holders.fetchAll);
  assert.equal(calls[3][0], "propertyDocuments");
  assert.equal(calls[3][1].repository, documents.documentRepository);
  assert.equal(calls[3][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[3][1].$, documents.$);
  assert.equal(calls[3][1].state, documents.state);
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
