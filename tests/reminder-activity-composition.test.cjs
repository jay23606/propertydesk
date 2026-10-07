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
  const shellWorkflow = fs.readFileSync(
    path.join(root, "features", "workspace-shell-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskWorkspaceShellWorkflow\.create\(/);
  assert.match(
    shellWorkflow,
    /WorkspaceReminderWorkflow\.create\(\s*reminder\s*\)[\s\S]*?WorkspaceNavigationWorkflow\.create\([\s\S]*?renderReminderActivity: reminders\.renderReminderActivity/,
  );
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
    /PropertyDeskNavigation\.create\(\{[\s\S]*?renderWorkspacePage: workspace\.renderWorkspacePage,/,
  );
  for (const feature of [
    "features/workspace-reminder-workflow.js",
    "features/workspace-navigation-workflow.js",
    "features/workspace-shell-workflow.js",
  ]) {
    assert.ok(html.includes(feature));
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
