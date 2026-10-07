const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workspace reminder workflow composes activity and reminder preview", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features", "workspace-reminder-workflow.js"),
    "utf8",
  );
  const create = app.indexOf("PropertyDeskWorkspaceReminderWorkflow.create(");
  const workspace = app.indexOf("PropertyDeskWorkspace.create(");

  assert.ok(create >= 0 && workspace > create);
  assert.match(
    workflow,
    /PropertyDeskReminderActivityView\.create\(\{[\s\S]*?model: activityModel,/,
  );
  assert.match(
    workflow,
    /PropertyDeskReminderPreview\.create\(\{[\s\S]*?model: previewModel/,
  );
  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?renderReminderActivity,/,
  );
  const asset = "features/workspace-reminder-workflow.js";
  assert.ok(html.includes(asset));
  assert.ok(worker.includes(`'./${asset}'`));
});
