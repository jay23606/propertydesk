const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property screen workflow passes detail actions to management and returns both", () => {
  const calls = [];
  const openPropertyDetails = () => "details";
  const content = { state: {} };
  const management = { closeModal() {}, toast() {} };
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
            attachPropertyHolderEvents() {},
            attachPropertyDocumentEvents() {},
          };
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

  const workflow = context.window.PropertyDeskPropertyScreenWorkflow.create({
    content,
    management,
  });

  assert.equal(calls[0][0], "content");
  assert.equal(calls[0][1], content);
  assert.equal(calls[1][0], "management");
  assert.equal(calls[1][1].closeModal, management.closeModal);
  assert.equal(calls[1][1].toast, management.toast);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal(workflow.openPropertyDetails, openPropertyDetails);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachPropertyDetailEvents",
    "attachPropertyDocumentEvents",
    "attachPropertyHolderEvents",
    "attachPropertyQuickActionEvents",
    "openPropertyDetails",
  ]);
});
