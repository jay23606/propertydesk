const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("reminder activity flows through reminder and workspace navigation workflows", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const reminderWorkflow = fs.readFileSync(
    path.join(root, "features", "workspace-reminder-workflow.js"),
    "utf8",
  );
  const navigationWorkflow = fs.readFileSync(
    path.join(root, "features", "workspace-navigation-workflow.js"),
    "utf8",
  );
  const reminder = app.indexOf("PropertyDeskWorkspaceReminderWorkflow.create(");
  const workspace = app.indexOf(
    "PropertyDeskWorkspaceNavigationWorkflow.create(",
  );

  assert.ok(reminder >= 0 && workspace > reminder);
  assert.match(
    reminderWorkflow,
    /PropertyDeskReminderActivityView\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.match(
    reminderWorkflow,
    /PropertyDeskReminderPreview\.create\(\{[\s\S]*?model: previewModel/,
  );
  assert.match(
    navigationWorkflow,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?renderReminderActivity,/,
  );
  assert.match(
    navigationWorkflow,
    /PropertyDeskNavigation\.create\(\{[\s\S]*?renderWorkspaceSettings: workspace\.renderWorkspaceSettings,/,
  );
  for (const feature of [
    "features/workspace-reminder-workflow.js",
    "features/workspace-navigation-workflow.js",
  ]) {
    assert.ok(html.includes(feature));
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
