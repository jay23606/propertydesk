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

test("app connects private document actions to their detail event router", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskPropertyDetailManagementWorkflow\.create\(/,
  );
  const workflow = fs.readFileSync(
    path.join(root, "features", "property-detail-management-workflow.js"),
    "utf8",
  );
  assert.match(
    workflow,
    /PropertyDeskDocuments\.create\([\s\S]*?repository: documentRepository,/,
  );
  assert.match(app, /PropertyDeskRepositoryRegistry\.create\(/);
  const registry = fs.readFileSync(
    path.join(root, "features", "repository-registry.js"),
    "utf8",
  );
  assert.match(registry, /documents: repositories\.documents\.create\(/);
  assert.match(
    app,
    /management:[\s\S]*?documentRepository: repositories\.documents,/,
  );
  assert.match(
    workflow,
    /PropertyDeskPropertyDetailDocumentEvents\.create\([\s\S]*?uploadPropertyDocument: propertyDocuments\.uploadPropertyDocument,[\s\S]*?deletePropertyDocument: propertyDocuments\.deletePropertyDocument,[\s\S]*?openPropertyDocument: propertyDocuments\.openPropertyDocument,/,
  );
  assert.match(app, /attachPropertyDocumentEvents/);
  assert.equal(
    fs.existsSync(path.join(root, "features", "property-document-workflow.js")),
    false,
  );
  assert.equal(html.includes("features/property-document-workflow.js"), false);
  assert.equal(
    worker.includes("features/property-document-workflow.js"),
    false,
  );
});
