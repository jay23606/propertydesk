const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property detail coordinator connects archive, holder, and document actions", () => {
  const passed = {};
  const binders = {
    detail: () => {},
    quick: () => {},
    holders: () => {},
    documents: () => {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyArchive: {
        create: (options) => {
          passed.archive = options;
          return { toggleArchiveProperty() {} };
        },
      },
      PropertyDeskPropertyDetailEvents: {
        create: (options) => {
          passed.detail = options;
          return { attachEvents: binders.detail };
        },
      },
      PropertyDeskPropertyDetailQuickActions: {
        create: (options) => {
          passed.quick = options;
          return { attachEvents: binders.quick };
        },
      },
      PropertyDeskPropertyHolderManagement: {
        create: (options) => {
          passed.holderManagement = options;
          return { savePropertyHolders() {} };
        },
      },
      PropertyDeskPropertyHolderEvents: {
        create: (options) => {
          passed.holderEvents = options;
          return { attachEvents: binders.holders };
        },
      },
      PropertyDeskDocumentRepository: {
        create: (getClient) => {
          passed.getClient = getClient;
          return { kind: "repository" };
        },
      },
      PropertyDeskDocuments: {
        create: (options) => {
          passed.documents = options;
          return {
            uploadPropertyDocument() {},
            deletePropertyDocument() {},
            openPropertyDocument() {},
          };
        },
      },
      PropertyDeskPropertyDetailDocumentEvents: {
        create: (options) => {
          passed.documentEvents = options;
          return { attachEvents: binders.documents };
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
        "property-detail-management-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const state = { client: { id: "workspace-client" } };
  const openPropertyDetails = () => {};
  const openPayment = () => {};
  const openExpense = () => {};
  const openAccountForProperty = () => {};
  const dependencies = {
    $() {},
    state,
    toast() {},
    fetchAll() {},
    todayIso() {},
    openPropertyDetails,
    closeModal() {},
    editAccount() {},
    openAccountDetails() {},
    openPayment,
    openExpense,
    openAccountForProperty,
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailManagementWorkflow.create(
      dependencies,
    );

  assert.equal(passed.archive.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.quick.openPayment, openPayment);
  assert.equal(passed.quick.openExpense, openExpense);
  assert.equal(passed.quick.openAccountForProperty, openAccountForProperty);
  assert.equal(
    passed.holderManagement.openPropertyDetails,
    openPropertyDetails,
  );
  assert.equal(passed.documents.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.documents.repository.kind, "repository");
  assert.equal(passed.getClient(), state.client);
  assert.equal(typeof passed.documentEvents.uploadPropertyDocument, "function");
  assert.equal(typeof passed.documentEvents.deletePropertyDocument, "function");
  assert.equal(typeof passed.documentEvents.openPropertyDocument, "function");
  assert.deepEqual(Object.keys(workflow), [
    "attachPropertyDetailEvents",
    "attachPropertyQuickActionEvents",
    "attachPropertyHolderEvents",
    "attachPropertyDocumentEvents",
  ]);
  assert.equal(workflow.attachPropertyDetailEvents, binders.detail);
  assert.equal(workflow.attachPropertyQuickActionEvents, binders.quick);
  assert.equal(workflow.attachPropertyHolderEvents, binders.holders);
  assert.equal(workflow.attachPropertyDocumentEvents, binders.documents);
});
