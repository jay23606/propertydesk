const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace members workflow joins roster rendering with membership actions", () => {
  const passed = {};
  const renderWorkspaceMembers = () => {};
  const attachEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspaceMembersView: {
        create(options) {
          passed.view = options;
          return { renderWorkspaceMembers };
        },
      },
      PropertyDeskWorkspaceMembers: {
        create(options) {
          passed.members = options;
          return { attachEvents };
        },
      },
    },
  });

  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-members-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    esc() {},
    toast() {},
    fetchAll() {},
    refreshWorkspaceSettings() {},
    repository: { addMember() {} },
    confirmAction() {},
  };
  const workflow =
    context.window.PropertyDeskWorkspaceMembersWorkflow.create(dependencies);

  assert.equal(passed.view.$, dependencies.$);
  assert.equal(passed.view.state, dependencies.state);
  assert.equal(
    passed.members.view.renderWorkspaceMembers,
    renderWorkspaceMembers,
  );
  assert.equal(
    passed.members.refreshWorkspaceSettings,
    dependencies.refreshWorkspaceSettings,
  );
  assert.equal(passed.members.repository, dependencies.repository);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachWorkspaceMemberEvents",
    "renderWorkspaceMembers",
  ]);
  assert.equal(workflow.renderWorkspaceMembers, renderWorkspaceMembers);
  assert.equal(workflow.attachWorkspaceMemberEvents, attachEvents);
});
