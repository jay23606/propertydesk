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

  assert.match(app, /PropertyDeskAppShellSetup\.create\(/);
  assert.match(
    fs.readFileSync(
      path.join(root, "features", "app-shell-workflow.js"),
      "utf8",
    ),
    /workspaceWorkflow\.create\(\{[\s\S]*?memberRepository: workspace\.memberRepository,[\s\S]*?confirmAction: workspace\.confirmAction,[\s\S]*?navigationWorkflow\.create\(\{/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    /reminder\.workflow\.create\(\{\s*\$: reminder\.\$,\s*getActivityData: getReminderActivityData,\s*esc: reminder\.esc,\s*fmtDate: reminder\.fmtDate,\s*fmtDateTime: reminder\.fmtDateTime,\s*money: reminder\.money,\s*activityModelWorkflow: reminder\.activityModelWorkflow,\s*activityViewWorkflow: reminder\.activityViewWorkflow,/,
  );
  assert.match(
    reminderWorkflow,
    /function createWorkspaceReminderWorkflow\(\{[\s\S]*?getActivityData,[\s\S]*?activityModelWorkflow,[\s\S]*?activityViewWorkflow,[\s\S]*?\}\) \{[\s\S]*?activityModelWorkflow\.create\(\{\s*getActivityData\s*\}\);[\s\S]*?activityViewWorkflow\.create\([\s\S]*?model: activityModel,/,
  );
  assert.match(
    reminderWorkflow,
    /activityViewWorkflow\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.doesNotMatch(reminderWorkflow, /ReminderPreview/);
  assert.match(
    app,
    /workflow: window\.PropertyDeskWorkspaceReminderWorkflow,[\s\S]*?activityModelWorkflow: window\.PropertyDeskReminderActivityModel,[\s\S]*?activityViewWorkflow: window\.PropertyDeskReminderActivityView/,
  );
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
