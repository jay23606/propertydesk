const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace workflow composes profile, member, and reminder settings", () => {
  const root = path.join(__dirname, "..");
  const passed = {};
  const updateGreeting = () => {};
  const renderWorkspaceMembers = () => {};
  let reminderActivityRenders = 0;
  const eventCalls = [];
  const attachProfileEvents = () => eventCalls.push("profile");
  const attachMemberEvents = () => eventCalls.push("members");
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspaceReminderWorkflow: {
        create(options) {
          passed.reminderWorkflow = options;
          return {
            renderReminderActivity: () => reminderActivityRenders++,
          };
        },
      },
      PropertyDeskWorkspaceProfileWorkflow: {
        create(options) {
          passed.profileWorkflow = options;
          return {
            updateGreeting,
            renderProfileSettings: () => (passed.displayName = "Owner"),
            attachProfileEvents,
          };
        },
      },
      PropertyDeskWorkspaceMembersView: {
        create(options) {
          passed.memberView = options;
          return { renderWorkspaceMembers };
        },
      },
      PropertyDeskWorkspaceMemberMaintenance: {
        create(options) {
          passed.memberMaintenance = options;
          return { addWorkspaceMember() {}, removeWorkspaceMember() {} };
        },
      },
      PropertyDeskWorkspaceMembers: {
        create(options) {
          passed.memberActions = options;
          return { attachWorkspaceMemberEvents: attachMemberEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    context,
  );

  const state = {
    user: { user_metadata: { display_name: "Owner" } },
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        party_name: "Buyer",
        email: "private@example.test",
      },
    ],
    workspaceMembers: [{ member_user_id: "member-1" }],
    properties: [
      { id: "property-1", address: "10 Main St", postal_code: "16601" },
    ],
    reminderLogs: [
      {
        account_id: "account-1",
        reminder_month: "2026-10-01",
        recipient_index: 1,
        recipient_email: "private@example.test",
        status: "accepted",
        reason: null,
        unpaid_due: 550,
        attempted_at: "2026-10-31T12:00:00Z",
      },
    ],
  };
  const now = () => new Date("2026-10-08T12:00:00.000Z");
  const memberRepository = { addMember() {}, removeMember() {} };
  const confirmAction = () => true;
  const run = () => {};
  const runAndRefreshWorkspaceChange = () => {};
  const reminder = {
    $() {},
    esc() {},
    fmtDate() {},
    fmtDateTime() {},
    money() {},
    workflow: context.window.PropertyDeskWorkspaceReminderWorkflow,
    activityModelWorkflow: {},
    activityViewWorkflow: {},
    unusedDependency: true,
  };
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: () => ({ value: "" }),
    getAccounts: () => state.accounts,
    getProperties: () => state.properties,
    getReminderLogs: () => state.reminderLogs,
    getUser: () => state.user,
    setUser: (user) => {
      state.user = user;
    },
    getWorkspaceMembers: () => state.workspaceMembers,
    getWorkspaceOwnerId: () => "owner-1",
    now,
    esc() {},
    toast() {},
    fetchAll() {},
    memberRepository,
    run,
    runAndRefreshWorkspaceChange,
    confirmAction,
    reminder,
    workflows: {
      profile: context.window.PropertyDeskWorkspaceProfileWorkflow,
      memberView: context.window.PropertyDeskWorkspaceMembersView,
      memberMaintenance: context.window.PropertyDeskWorkspaceMemberMaintenance,
      members: context.window.PropertyDeskWorkspaceMembers,
      profileModules: {},
    },
  });
  const workspaceSource = fs.readFileSync(
    path.join(root, "features", "workspace.js"),
    "utf8",
  );
  assert.doesNotMatch(
    workspaceSource,
    /window\.PropertyDeskWorkspace(?:ProfileWorkflow|MembersView|Members|MemberMaintenance)\.create/,
  );
  assert.doesNotMatch(workspaceSource, /window\.confirm/);
  assert.doesNotMatch(workspaceSource, /\bstate\b/);

  assert.equal(passed.profileWorkflow.getUser(), state.user);
  assert.equal("state" in passed.profileWorkflow, false);
  assert.equal(typeof passed.profileWorkflow.setUser, "function");
  assert.equal(passed.profileWorkflow.now, now);
  assert.equal(passed.profileWorkflow.run, run);
  assert.equal(
    passed.memberActions.runAndRefreshWorkspaceChange,
    runAndRefreshWorkspaceChange,
  );
  assert.equal(passed.memberActions.confirmAction, confirmAction);
  assert.equal("state" in passed.memberActions, false);
  const reminderActivityData = passed.reminderWorkflow.getActivityData();
  assert.deepEqual(Object.keys(reminderActivityData).sort(), [
    "accounts",
    "properties",
    "reminderLogs",
  ]);
  assert.deepEqual(Object.keys(reminderActivityData.accounts[0]).sort(), [
    "id",
    "name",
    "party_name",
    "property_id",
  ]);
  assert.deepEqual(Object.keys(reminderActivityData.properties[0]).sort(), [
    "address",
    "id",
    "name",
  ]);
  assert.deepEqual(Object.keys(reminderActivityData.reminderLogs[0]).sort(), [
    "account_id",
    "attempted_at",
    "reason",
    "recipient_index",
    "reminder_month",
    "status",
    "unpaid_due",
  ]);
  assert.equal(
    JSON.stringify(reminderActivityData).includes("private@example.test"),
    false,
  );
  assert.deepEqual(Object.keys(passed.reminderWorkflow).sort(), [
    "$",
    "activityModelWorkflow",
    "activityViewWorkflow",
    "esc",
    "fmtDate",
    "fmtDateTime",
    "getActivityData",
    "money",
  ]);
  for (const key of Object.keys(passed.reminderWorkflow)) {
    if (key === "getActivityData") continue;
    assert.equal(passed.reminderWorkflow[key], reminder[key]);
  }
  assert.equal(typeof passed.reminderWorkflow.getActivityData, "function");
  assert.equal(passed.profileWorkflow.toast instanceof Function, true);
  assert.equal(passed.memberActions.repository, memberRepository);
  assert.equal(
    passed.memberActions.maintenanceWorkflow,
    context.window.PropertyDeskWorkspaceMemberMaintenance,
  );
  assert.equal(
    passed.memberActions.getWorkspaceMembers(),
    state.workspaceMembers,
  );
  assert.equal(
    passed.memberActions.view.renderWorkspaceMembers,
    renderWorkspaceMembers,
  );
  assert.equal(
    typeof passed.memberActions.refreshWorkspaceSettings,
    "function",
  );
  assert.equal(workflow.updateGreeting, updateGreeting);
  assert.equal(Object.isFrozen(workflow), true);
  assert.equal("previewReminderEmail" in workflow, false);
  workflow.renderWorkspacePage();
  assert.equal(passed.displayName, "Owner");
  assert.equal(reminderActivityRenders, 1);
  passed.memberActions.refreshWorkspaceSettings();
  assert.equal(reminderActivityRenders, 1);
  workflow.attachProfileEvents();
  workflow.attachWorkspaceMemberEvents();
  assert.equal(passed.memberView.esc instanceof Function, true);
  assert.deepEqual(eventCalls, ["profile", "members"]);
});
