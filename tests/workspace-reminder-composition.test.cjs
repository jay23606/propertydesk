const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app shell shares workspace reminder preview with account forms", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const workspace = fs.readFileSync(
    path.join(root, "features", "workspace.js"),
    "utf8",
  );

  assert.match(
    workspace,
    /PropertyDeskWorkspaceReminderWorkflow\.create\(reminder\)/,
  );
  assert.match(
    app,
    /const \{[\s\S]*?previewReminderEmail,[\s\S]*?\} = appShell/,
  );
  assert.doesNotMatch(app, /PropertyDeskWorkspaceReminderWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskPropertyAccountFormsWorkflow\.create\(\{[\s\S]*?account: \{[\s\S]*?previewReminderEmail,/,
  );
  for (const feature of [
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview.js",
    "features/reminder-preview-model.js",
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
