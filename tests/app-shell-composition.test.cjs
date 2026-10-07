const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app root connects workspace settings to navigation and reminder activity", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{\s*\$,\s*state,\s*esc,\s*toast,\s*fetchAll,/,
  );
  const renderWorkspaceSettings = app.match(
    /function renderWorkspaceSettings\(\)\s*\{[^}]*\}/,
  )?.[0];
  assert.ok(
    renderWorkspaceSettings,
    "app root refreshes both workspace sections",
  );
  const events = [];
  const context = vm.createContext({
    workspace: {
      renderWorkspaceSettings: () => events.push("workspace"),
    },
    renderReminderActivity: () => events.push("reminders"),
  });
  vm.runInContext(
    `${renderWorkspaceSettings}; renderWorkspaceSettings();`,
    context,
  );
  assert.deepEqual(events, ["workspace", "reminders"]);
  assert.match(
    app,
    /PropertyDeskNavigation\.create\(\{\s*\$,\s*state,\s*renderWorkspaceSettings,/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachNavigationEvents,\s*attachProfileEvents,\s*attachWorkspaceMemberEvents,/,
  );
  for (const script of ["features/workspace.js", "features/navigation.js"]) {
    assert.ok(html.indexOf(script) < html.indexOf("app.js"));
    assert.ok(worker.includes(`'./${script}'`));
  }
  assert.equal(
    fs.existsSync(path.join(root, "features", "app-shell-workflow.js")),
    false,
  );
});
