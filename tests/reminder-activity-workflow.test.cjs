const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("reminder activity workflow connects delivery data to the view", () => {
  const passed = {};
  const renderReminderActivity = () => "rendered";
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityModel: {
        create: (options) => {
          passed.model = options;
          return { buildRows: () => [] };
        },
      },
      PropertyDeskReminderActivityView: {
        create: (options) => {
          passed.view = options;
          return { renderReminderActivity };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-activity-workflow.js"),
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
  };
  const workflow =
    context.window.PropertyDeskReminderActivityWorkflow.create(dependencies);

  assert.equal(passed.model.state, dependencies.state);
  assert.equal(passed.view.$, dependencies.$);
  assert.equal(passed.view.esc, dependencies.esc);
  assert.equal(passed.view.fmtDate, dependencies.fmtDate);
  assert.equal(passed.view.money, dependencies.money);
  assert.equal(typeof passed.view.model.buildRows, "function");
  assert.deepEqual(Object.keys(workflow), ["renderReminderActivity"]);
  assert.equal(workflow.renderReminderActivity, renderReminderActivity);
});
