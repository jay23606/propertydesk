const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("reminder preview workflow composes the account editor preview directly", () => {
  const calls = [];
  const model = { kind: "preview model" };
  const previewReminderEmail = () => "preview";
  const context = vm.createContext({
    window: {
      PropertyDeskReminderPreviewModel: {
        create(options) {
          calls.push(["model", options]);
          return model;
        },
      },
      PropertyDeskReminderPreview: {
        create(options) {
          calls.push(["preview", options]);
          return { previewReminderEmail };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview-workflow.js"),
      "utf8",
    ),
    context,
  );

  const services = {
    $() {},
    state: {},
    paymentReminderMessage() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    monthEnd() {},
    dateOnly() {},
    monthStart() {},
    propertyAddress() {},
    money() {},
    todayIso() {},
    moneyInput() {},
    toast() {},
    esc() {},
    openModal() {},
    splitEmailAddresses() {},
    workflows: {
      model: context.window.PropertyDeskReminderPreviewModel,
      preview: context.window.PropertyDeskReminderPreview,
    },
  };
  const workflow =
    context.window.PropertyDeskReminderPreviewWorkflow.create(services);
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "reminder-preview-workflow.js"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /window\.PropertyDeskReminderPreview(?:Model)?\.create/,
  );

  assert.deepEqual(
    calls.map(([name]) => name),
    ["model", "preview"],
  );
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "amountDueSince",
    "dateOnly",
    "money",
    "monthEnd",
    "monthStart",
    "paymentReminderMessage",
    "propertyAddress",
    "unpaidDueAccrualStart",
  ]);
  assert.equal(calls[1][1].$, services.$);
  assert.equal(calls[1][1].state, services.state);
  assert.equal(calls[1][1].model, model);
  assert.equal(calls[1][1].openModal, services.openModal);
  assert.equal(calls[1][1].splitEmailAddresses, services.splitEmailAddresses);
  assert.deepEqual(Object.keys(workflow), ["previewReminderEmail"]);
  assert.equal(workflow.previewReminderEmail, previewReminderEmail);
});
