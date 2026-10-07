const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace reminder workflow builds the activity view and email preview", () => {
  const passed = {};
  const renderReminderActivity = () => {};
  const previewReminderEmail = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityModel: {
        create: (options) => {
          passed.activityModel = options;
          return { kind: "activity model" };
        },
      },
      PropertyDeskReminderActivityView: {
        create: (options) => {
          passed.activityView = options;
          return { renderReminderActivity };
        },
      },
      PropertyDeskReminderPreviewModel: {
        create: (options) => {
          passed.previewModel = options;
          return { kind: "preview model" };
        },
      },
      PropertyDeskReminderPreview: {
        create: (options) => {
          passed.preview = options;
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

  const dependencies = {
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
  const workflow =
    context.window.PropertyDeskWorkspaceReminderWorkflow.create(dependencies);

  assert.equal(passed.activityModel.state, dependencies.state);
  assert.equal(passed.activityView.model.kind, "activity model");
  assert.equal(passed.previewModel.amountDueSince, dependencies.amountDueSince);
  assert.equal(
    passed.previewModel.propertyAddress,
    dependencies.propertyAddress,
  );
  assert.equal(passed.preview.model.kind, "preview model");
  assert.equal(passed.preview.openModal, dependencies.openModal);
  assert.equal(workflow.renderReminderActivity, renderReminderActivity);
  assert.equal(workflow.previewReminderEmail, previewReminderEmail);
});
