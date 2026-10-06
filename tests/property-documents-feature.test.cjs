const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property detail document events route private document actions to document workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-detail-document-events.js",
      ),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const handlers = new Map();
  const feature =
    context.window.PropertyDeskPropertyDetailDocumentEvents.create({
      $: (id) => ({
        addEventListener(name, handler) {
          handlers.set(`${id}:${name}`, handler);
        },
      }),
      openPropertyDocument: (id) => calls.push(["open", id]),
      deletePropertyDocument: (id) => calls.push(["delete", id]),
      uploadPropertyDocument: (input) => calls.push(["upload", input.id]),
    });
  feature.attachEvents();

  let prevented = false;
  let propagationStopped = false;
  handlers.get("property-detail-content:click")({
    target: {
      closest: (value) =>
        value === "[data-open-document]"
          ? { dataset: { openDocument: "document-1" } }
          : null,
    },
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      propagationStopped = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(propagationStopped, true);
  handlers.get("property-detail-content:click")({
    target: {
      closest: (value) =>
        value === "[data-delete-document]"
          ? { dataset: { deleteDocument: "document-2" } }
          : null,
    },
    preventDefault() {
      assert.fail(
        "delete action should preserve its existing default behavior",
      );
    },
    stopPropagation() {
      assert.fail("delete action should preserve event bubbling");
    },
  });
  const input = {
    id: "agreement-input",
    matches: (selector) => selector === "[data-property-document]",
  };
  handlers.get("property-detail-content:change")({ target: input });

  assert.deepEqual(calls, [
    ["open", "document-1"],
    ["delete", "document-2"],
    ["upload", "agreement-input"],
  ]);
});

test("property document workflow composes private file actions and event routing", () => {
  const passed = {};
  const action = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDocuments: {
        create: (options) => {
          passed.documents = options;
          return {
            uploadPropertyDocument: action,
            deletePropertyDocument: action,
            openPropertyDocument: action,
          };
        },
      },
      PropertyDeskDocumentRepository: {
        create: (clientSource) => {
          passed.clientSource = clientSource;
          return {};
        },
      },
      PropertyDeskPropertyDetailDocumentEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: action };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-document-workflow.js"),
      "utf8",
    ),
    context,
  );
  const state = { client: null };
  const attach = context.window.PropertyDeskPropertyDocumentWorkflow.create({
    $: action,
    state,
    toast: action,
    fetchAll: action,
    openPropertyDetails: action,
  }).attachPropertyDocumentEvents;

  assert.equal(typeof attach, "function");
  assert.equal(passed.clientSource(), null);
  const client = {};
  state.client = client;
  assert.equal(passed.clientSource(), client);
  assert.equal(passed.events.uploadPropertyDocument, action);
  assert.equal(passed.events.deletePropertyDocument, action);
  assert.equal(passed.events.openPropertyDocument, action);
});
