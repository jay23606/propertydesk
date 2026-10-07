const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property holder workflow connects saves to its delegated event binder", () => {
  const passed = {};
  const attachEvents = () => {};
  const savePropertyHolders = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyHolderManagement: {
        create(options) {
          passed.management = options;
          return { savePropertyHolders };
        },
      },
      PropertyDeskPropertyHolderEvents: {
        create(options) {
          passed.events = options;
          return { attachPropertyHolderEvents: attachEvents };
        },
      },
    },
  });

  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-holder-workflow.js"),
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
    repository: { kind: "holder-repository" },
  };
  const workflow =
    context.window.PropertyDeskPropertyHolderWorkflow.create(dependencies);

  assert.equal(passed.management.state, dependencies.state);
  assert.equal(passed.management.toast, dependencies.toast);
  assert.equal(passed.management.fetchAll, dependencies.fetchAll);
  assert.equal(
    passed.management.openPropertyDetails,
    dependencies.openPropertyDetails,
  );
  assert.equal(passed.management.repository, dependencies.repository);
  assert.equal("$" in passed.management, false);
  assert.equal(passed.events.$, dependencies.$);
  assert.equal(passed.events.savePropertyHolders, savePropertyHolders);
  assert.deepEqual(Object.keys(workflow), ["attachPropertyHolderEvents"]);
  assert.equal(workflow.attachPropertyHolderEvents, attachEvents);
});
