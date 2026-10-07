const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app uses the workspace reminder coordinator for email preview and activity", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(
    app,
    /previewReminderEmail,[\s\S]*?\} = window\.PropertyDeskWorkspaceShellWorkflow\.create\(/,
  );
  assert.match(app, /PropertyDeskWorkspaceShellWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskRecordEntryWorkflow\.create\(\{[\s\S]*?previewReminderEmail,/,
  );
  for (const feature of [
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview.js",
    "features/reminder-preview-model.js",
    "features/workspace-reminder-workflow.js",
    "features/workspace-navigation-workflow.js",
    "features/workspace-shell-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(feature) >= 0 &&
        html.indexOf(feature) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${feature}'`));
  }
  assert.doesNotMatch(html, /record-entry-support-workflow\.js/);
  assert.doesNotMatch(worker, /record-entry-support-workflow\.js/);
});
