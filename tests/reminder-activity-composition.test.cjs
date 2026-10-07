const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app composes the reminder activity model into its display view", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const model = app.indexOf("PropertyDeskReminderActivityModel.create(");
  const view = app.indexOf("PropertyDeskReminderActivityView.create(");
  const workspace = app.indexOf("PropertyDeskWorkspace.create(");

  assert.ok(model >= 0);
  assert.ok(view > model);
  assert.ok(workspace > view);
  assert.match(
    app,
    /PropertyDeskReminderActivityView\.create\(\{[\s\S]*?model: reminderActivityModel,/,
  );
  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?renderReminderActivity,/,
  );
  assert.doesNotMatch(app, /PropertyDeskReminderActivityWorkflow/);
  assert.doesNotMatch(html, /features\/reminder-activity-workflow\.js/);
  assert.doesNotMatch(worker, /features\/reminder-activity-workflow\.js/);
  assert.equal(
    fs.existsSync(path.join(root, "features", "reminder-activity-workflow.js")),
    false,
  );
});
