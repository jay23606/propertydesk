const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace reminder workflow composes activity and preview features", () => {
  const calls = [];
  const activityModel = { kind: "activity model" };
  const previewModel = { kind: "preview model" };
  const renderReminderActivity = () => "activity";
  const previewReminderEmail = () => "preview";
  const reminder = {
    $() {},
    state: {},
    esc() {},
    fmtDate() {},
    money() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    monthEnd() {},
    dateOnly() {},
    monthStart() {},
    propertyAddress() {},
    todayIso() {},
    moneyInput() {},
    toast() {},
    openModal() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityModel: {
        create(options) {
          calls.push(["activity-model", options]);
          return activityModel;
        },
      },
      PropertyDeskReminderActivityView: {
        create(options) {
          calls.push(["activity-view", options]);
          return { renderReminderActivity };
        },
      },
      PropertyDeskReminderPreviewModel: {
        create(options) {
          calls.push(["preview-model", options]);
          return previewModel;
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
      path.join(__dirname, "..", "features", "workspace-reminder-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskWorkspaceReminderWorkflow.create(reminder);

  assert.deepEqual(
    calls.map(([name]) => name),
    ["activity-model", "activity-view", "preview-model", "preview"],
  );
  assert.equal(calls[0][1].state, reminder.state);
  assert.equal(calls[1][1].model, activityModel);
  assert.equal(calls[2][1].amountDueSince, reminder.amountDueSince);
  assert.equal(calls[2][1].propertyAddress, reminder.propertyAddress);
  assert.equal(calls[3][1].model, previewModel);
  assert.equal(calls[3][1].openModal, reminder.openModal);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "previewReminderEmail",
    "renderReminderActivity",
  ]);
  assert.equal(workflow.previewReminderEmail, previewReminderEmail);
  assert.equal(workflow.renderReminderActivity, renderReminderActivity);
});
