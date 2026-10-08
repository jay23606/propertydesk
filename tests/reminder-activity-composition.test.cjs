const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("reminder activity flows through reminder and workspace navigation workflows", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
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
    /ReminderActivityModel\.create\(\{\s*state: reminder\.state,[\s\S]*?ReminderActivityView\.create\([\s\S]*?model: activityModel,[\s\S]*?ReminderPreviewModel\.create\([\s\S]*?ReminderPreview\.create\([\s\S]*?WorkspaceNavigationWorkflow\.create\([\s\S]*?renderReminderActivity,/,
  );
  assert.match(
    shellWorkflow,
    /ReminderActivityView\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.match(
    shellWorkflow,
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
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview-model.js",
    "features/reminder-preview.js",
    "features/workspace-navigation-workflow.js",
    "features/workspace-shell-workflow.js",
  ]) {
    assert.ok(html.includes(feature));
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
