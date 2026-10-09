const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("account forms receive reminder preview independently of workspace activity", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const workspaceReminder = fs.readFileSync(
    path.join(root, "features", "workspace-reminder-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskReminderPreviewSetup\.create\(/);
  assert.doesNotMatch(
    workspaceReminder,
    /ReminderPreviewModel|PropertyDeskReminderPreview\./,
  );
  assert.match(
    app,
    /PropertyDeskPropertyAccountFormsSetup\.create\(\{[\s\S]*?previewReminderEmail,/,
  );
  for (const feature of [
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview.js",
    "features/reminder-preview-model.js",
    "features/reminder-preview-workflow.js",
    "features/reminder-preview-setup.js",
    "features/workspace-reminder-workflow.js",
    "features/property-form.js",
    "features/account-form.js",
    "features/ledger-entry-forms.js",
  ]) {
    assert.ok(
      html.indexOf(feature) >= 0 &&
        html.indexOf(feature) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
