const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace reminder workflow composes only its activity view", () => {
  const calls = [];
  const activityModel = { kind: "activity model" };
  const renderReminderActivity = () => "activity";
  const reminder = {
    $() {},
    state: {},
    esc() {},
    fmtDate() {},
    money() {},
    unusedDependency: true,
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
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-reminder-workflow.js"),
      "utf8",
    ),
    context,
  );
  reminder.activityModelWorkflow =
    context.window.PropertyDeskReminderActivityModel;
  reminder.activityViewWorkflow =
    context.window.PropertyDeskReminderActivityView;

  const workflow =
    context.window.PropertyDeskWorkspaceReminderWorkflow.create(reminder);

  assert.deepEqual(
    calls.map(([name]) => name),
    ["activity-model", "activity-view"],
  );
  assert.equal(calls[0][1].state, reminder.state);
  assert.deepEqual(Object.keys(calls[0][1]), ["state"]);
  assert.equal(calls[1][1].$, reminder.$);
  assert.equal(calls[1][1].esc, reminder.esc);
  assert.equal(calls[1][1].fmtDate, reminder.fmtDate);
  assert.equal(calls[1][1].money, reminder.money);
  assert.equal(calls[1][1].model, activityModel);
  assert.deepEqual(Object.keys(workflow), ["renderReminderActivity"]);
  assert.equal(workflow.renderReminderActivity, renderReminderActivity);
});
