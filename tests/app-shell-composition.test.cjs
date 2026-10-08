const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app composes workspace settings and page navigation directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workspace = fs.readFileSync(
    path.join(root, "features", "workspace.js"),
    "utf8",
  );

  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?reminder: \{[\s\S]*?openModal: modal\.openModal,[\s\S]*?memberRepository: repositories\.workspaceMembers,[\s\S]*?authClient,/,
  );
  assert.match(
    app,
    /PropertyDeskNavigation\.create\(\{[\s\S]*?renderWorkspacePage: workspace\.renderWorkspacePage,[\s\S]*?documentRef: document,[\s\S]*?windowRef: window,/,
  );
  assert.match(
    workspace,
    /PropertyDeskWorkspaceReminderWorkflow\.create\(reminder\)/,
  );
  assert.match(
    workspace,
    /function renderWorkspacePage\(\)\s*\{\s*renderWorkspaceSettings\(\);\s*reminderWorkflow\.renderReminderActivity\(\);/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachNavigationEvents,[\s\S]*?attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  for (const script of [
    "features/workspace.js",
    "features/navigation.js",
    "features/workspace-reminder-workflow.js",
  ]) {
    assert.ok(html.indexOf(script) < html.indexOf("app.js"));
    assert.ok(worker.includes(`'./${script}'`));
  }
});
