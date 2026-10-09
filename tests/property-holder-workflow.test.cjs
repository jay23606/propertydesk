const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property-holder workflow connects saving to one explicit event binder", () => {
  const root = path.join(__dirname, "..");
  const calls = [];
  const reconcileWorkspaceChange = () => {};
  const refreshWorkspace = () => {};
  const savePropertyHolders = () => {};
  const attachPropertyHolderEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyHolderManagement: {
        create(options) {
          calls.push(["management", options]);
          return { savePropertyHolders };
        },
      },
      PropertyDeskPropertyHolderEvents: {
        create(options) {
          calls.push(["events", options]);
          return { attachPropertyHolderEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "property-holder-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    repository: {},
    reconcileWorkspaceChange,
    refreshWorkspace,
    openPropertyDetails() {},
    workflows: {
      management: context.window.PropertyDeskPropertyHolderManagement,
      events: context.window.PropertyDeskPropertyHolderEvents,
    },
  };
  const workflow =
    context.window.PropertyDeskPropertyHolderWorkflow.create(dependencies);

  assert.equal(calls[0][0], "management");
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(root, "features", "property-holder-workflow.js"),
      "utf8",
    ),
    /writeFeedback/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(root, "features", "property-holder-management.js"),
      "utf8",
    ),
    /writeFeedback/,
  );
  assert.equal(calls[0][1].repository, dependencies.repository);
  assert.equal(calls[0][1].reconcileWorkspaceChange, reconcileWorkspaceChange);
  assert.equal(calls[0][1].refreshWorkspace, refreshWorkspace);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "fetchAll",
    "openPropertyDetails",
    "reconcileWorkspaceChange",
    "refreshWorkspace",
    "repository",
    "state",
    "toast",
  ]);
  assert.equal(calls[0][1].state, dependencies.state);
  assert.equal(
    calls[0][1].openPropertyDetails,
    dependencies.openPropertyDetails,
  );
  assert.equal(calls[1][0], "events");
  assert.equal(calls[1][1].$, dependencies.$);
  assert.equal(calls[1][1].savePropertyHolders, savePropertyHolders);
  assert.deepEqual(Object.keys(workflow), ["attachPropertyHolderEvents"]);
  assert.equal(workflow.attachPropertyHolderEvents, attachPropertyHolderEvents);
  assert.equal(Object.isFrozen(workflow), true);
});

test("property-holder workflow loads before the property screen and is cached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const feature = "features/property-holder-workflow.js";

  assert.ok(
    html.indexOf("features/property-holder-events.js") < html.indexOf(feature),
  );
  assert.ok(
    html.indexOf(feature) <
      html.indexOf("features/property-screen-workflow.js"),
  );
  assert.ok(worker.includes(`'./${feature}'`));
});
