const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property document workflow connects private file actions to detail events", () => {
  const passed = {};
  const attachEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDocuments: {
        create(options) {
          passed.documents = options;
          return {
            uploadPropertyDocument() {},
            deletePropertyDocument() {},
            openPropertyDocument() {},
          };
        },
      },
      PropertyDeskPropertyDetailDocumentEvents: {
        create(options) {
          passed.events = options;
          return { attachPropertyDocumentEvents: attachEvents };
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
        "property-document-management-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    openPropertyDetails() {},
    documentRepository: { kind: "document-repository" },
  };
  const workflow =
    context.window.PropertyDeskPropertyDocumentManagementWorkflow.create(
      dependencies,
    );

  assert.equal(passed.documents.state, dependencies.state);
  assert.equal(passed.documents.toast, dependencies.toast);
  assert.equal(passed.documents.fetchAll, dependencies.fetchAll);
  assert.equal(
    passed.documents.openPropertyDetails,
    dependencies.openPropertyDetails,
  );
  assert.equal(passed.documents.repository, dependencies.documentRepository);
  assert.equal("documentRepository" in passed.documents, false);
  assert.equal("$" in passed.documents, false);
  assert.equal(typeof passed.events.uploadPropertyDocument, "function");
  assert.equal(typeof passed.events.deletePropertyDocument, "function");
  assert.equal(typeof passed.events.openPropertyDocument, "function");
  assert.equal(passed.events.$, dependencies.$);
  assert.deepEqual(Object.keys(workflow), ["attachPropertyDocumentEvents"]);
  assert.equal(workflow.attachPropertyDocumentEvents, attachEvents);
});
