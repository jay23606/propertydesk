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
  feature.attachPropertyDocumentEvents();

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

test("property document workflow connects private actions and detail events", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const setup = fs.readFileSync(
    path.join(root, "features", "property-workspace-setup.js"),
    "utf8",
  );
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskPropertyWorkspaceSetup\.create\(/);
  assert.match(
    setup,
    /documents: \{[\s\S]*?confirm: ui\.confirmAction,[\s\S]*?openWindow: ui\.openWindow,/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskPropertyDetailManagementWorkflow\.create\(/,
  );
  const workflow = fs.readFileSync(
    path.join(root, "features", "property-document-workflow.js"),
    "utf8",
  );
  const screenWorkflow = fs.readFileSync(
    path.join(root, "features", "property-screen-workflow.js"),
    "utf8",
  );
  assert.match(screenWorkflow, /repository: documents\.documentRepository/);
  assert.match(screenWorkflow, /refreshWorkspace: documents\.refreshWorkspace/);
  assert.match(
    app,
    /repositories: \{[\s\S]*?documents: window\.PropertyDeskDocumentRepository,/,
  );
  const registry = fs.readFileSync(
    path.join(root, "features", "repository-registry.js"),
    "utf8",
  );
  assert.match(registry, /documents: repositories\.documents\.create\(/);
  assert.match(setup, /documentRepository: services\.documentRepository/);
  assert.match(
    workflow,
    /documentEventsWorkflow\.create\([\s\S]*?uploadPropertyDocument: documents\.uploadPropertyDocument,[\s\S]*?deletePropertyDocument: documents\.deletePropertyDocument,[\s\S]*?openPropertyDocument: documents\.openPropertyDocument,/,
  );
  assert.match(app, /attachPropertyDocumentEvents/);
  assert.ok(html.includes("features/property-document-workflow.js"));
  assert.ok(worker.includes("'./features/property-document-workflow.js'"));
  assert.ok(
    html.indexOf("features/documents.js") <
      html.indexOf("features/property-document-workflow.js") &&
      html.indexOf("features/property-document-workflow.js") <
        html.indexOf("features/property-screen-workflow.js"),
  );
});

test("property document workflow routes actions through one explicit binder", () => {
  const root = path.join(__dirname, "..");
  const calls = [];
  const actions = {
    uploadPropertyDocument() {},
    deletePropertyDocument() {},
    openPropertyDocument() {},
  };
  const attachPropertyDocumentEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDocuments: {
        create(options) {
          calls.push(["documents", options]);
          return actions;
        },
      },
      PropertyDeskPropertyDetailDocumentEvents: {
        create(options) {
          calls.push(["events", options]);
          return { attachPropertyDocumentEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "property-document-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    getSelectedPropertyId() {},
    getWorkspaceOwnerId() {},
    getDocuments() {},
    toast() {},
    fetchAll() {},
    openPropertyDetails() {},
    confirm: () => true,
    openWindow: () => null,
    repository: {},
    refreshWorkspace() {},
    modules: { kind: "document-modules" },
    documentsWorkflow: context.window.PropertyDeskDocuments,
    documentEventsWorkflow:
      context.window.PropertyDeskPropertyDetailDocumentEvents,
  };
  const workflow =
    context.window.PropertyDeskPropertyDocumentWorkflow.create(dependencies);

  assert.equal(calls[0][0], "documents");
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "confirm",
    "fetchAll",
    "getDocuments",
    "getSelectedPropertyId",
    "getWorkspaceOwnerId",
    "modules",
    "openPropertyDetails",
    "openWindow",
    "refreshWorkspace",
    "repository",
    "toast",
  ]);
  assert.equal(calls[0][1].repository, dependencies.repository);
  assert.equal(
    calls[0][1].getSelectedPropertyId,
    dependencies.getSelectedPropertyId,
  );
  assert.equal(
    calls[0][1].getWorkspaceOwnerId,
    dependencies.getWorkspaceOwnerId,
  );
  assert.equal(calls[0][1].getDocuments, dependencies.getDocuments);
  assert.equal(calls[0][1].modules, dependencies.modules);
  assert.equal(calls[0][1].confirm, dependencies.confirm);
  assert.equal(calls[0][1].openWindow, dependencies.openWindow);
  assert.equal(calls[0][1].refreshWorkspace, dependencies.refreshWorkspace);
  assert.equal(calls[1][0], "events");
  assert.equal(calls[1][1].$, dependencies.$);
  assert.equal(
    calls[1][1].uploadPropertyDocument,
    actions.uploadPropertyDocument,
  );
  assert.equal(
    calls[1][1].deletePropertyDocument,
    actions.deletePropertyDocument,
  );
  assert.equal(calls[1][1].openPropertyDocument, actions.openPropertyDocument);
  assert.deepEqual(Object.keys(workflow), ["attachPropertyDocumentEvents"]);
  assert.equal(
    workflow.attachPropertyDocumentEvents,
    attachPropertyDocumentEvents,
  );
  assert.equal(Object.isFrozen(workflow), true);
});
