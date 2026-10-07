const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("create actions workflow exposes the global launcher event binder", () => {
  const dependencies = { navigate() {}, openPayment() {} };
  const attachEvents = () => {};
  let passed;
  const context = vm.createContext({
    window: {
      PropertyDeskCreateActions: {
        create(options) {
          passed = options;
          return { attachCreateActionEvents: attachEvents };
        },
      },
    },
  });

  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "create-actions-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskCreateActionsWorkflow.create(dependencies);

  assert.equal(passed, dependencies);
  assert.deepEqual(Object.keys(workflow), ["attachCreateActionEvents"]);
  assert.equal(workflow.attachCreateActionEvents, attachEvents);
});
