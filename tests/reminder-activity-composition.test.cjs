const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workspace reminder activity and preview stay independent of navigation", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const reminderWorkflow = fs.readFileSync(
    path.join(root, "features", "workspace-reminder-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskWorkspace\.create\(/);
  assert.match(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    /PropertyDeskWorkspaceReminderWorkflow\.create\(reminder\)/,
  );
  assert.match(
    reminderWorkflow,
    /ReminderActivityModel\.create\(\{\s*state: reminder\.state,[\s\S]*?ReminderActivityView\.create\([\s\S]*?model: activityModel,[\s\S]*?ReminderPreviewModel\.create\([\s\S]*?ReminderPreview\.create\(/,
  );
  assert.match(
    reminderWorkflow,
    /ReminderActivityView\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.match(
    reminderWorkflow,
    /PropertyDeskReminderPreview\.create\(\{[\s\S]*?model: previewModel/,
  );
  for (const feature of [
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview-model.js",
    "features/reminder-preview.js",
    "features/workspace-reminder-workflow.js",
  ]) {
    assert.ok(html.includes(feature));
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
