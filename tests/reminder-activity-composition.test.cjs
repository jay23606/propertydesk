const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workspace reminder activity stays independent of account email preview", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const reminderWorkflow = fs.readFileSync(
    path.join(root, "features", "workspace-reminder-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskAppShellWorkflow\.create\(/);
  assert.match(
    fs.readFileSync(
      path.join(root, "features", "app-shell-workflow.js"),
      "utf8",
    ),
    /workspaceWorkflow\.create\(\{[\s\S]*?memberRepository: workspace\.memberRepository,[\s\S]*?confirmAction: workspace\.confirmAction,[\s\S]*?navigationWorkflow\.create\(\{/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    /PropertyDeskWorkspaceReminderWorkflow\.create\(\{\s*\$: reminder\.\$,\s*state: reminder\.state,\s*esc: reminder\.esc,\s*fmtDate: reminder\.fmtDate,\s*money: reminder\.money,/,
  );
  assert.match(
    reminderWorkflow,
    /function createWorkspaceReminderWorkflow\(\{[\s\S]*?state,[\s\S]*?\}\) \{[\s\S]*?ReminderActivityModel\.create\(\{\s*state,[\s\S]*?ReminderActivityView\.create\([\s\S]*?model: activityModel,/,
  );
  assert.match(
    reminderWorkflow,
    /ReminderActivityView\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.doesNotMatch(reminderWorkflow, /ReminderPreview/);
  for (const feature of [
    "features/reminder-activity-model.js",
    "features/reminder-activity-view.js",
    "features/reminder-preview-model.js",
    "features/reminder-preview.js",
    "features/reminder-preview-workflow.js",
    "features/workspace-reminder-workflow.js",
  ]) {
    assert.ok(html.includes(feature));
    assert.ok(worker.includes(`'./${feature}'`));
  }
});
