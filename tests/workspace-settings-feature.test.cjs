const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createAuthClient,
  createRepositoryWriteFeedback,
  loadWorkspaceFeatures,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("workspace member maintenance uses its injected change operation", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-member-maintenance.js"),
    "utf8",
  );
  assert.doesNotMatch(source, /window\.PropertyDeskRepositoryWriteFeedback/);
  assert.doesNotMatch(source, /writeFeedback/);
  assert.doesNotMatch(source, /window\.confirm/);
  const members = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-members.js"),
    "utf8",
  );
  assert.match(members, /confirmAction,\s*\}\);/);
  assert.match(members, /runAndRefreshWorkspaceChange,/);
});

test("workspace feature owns profile and member form bindings", () => {
  const context = vm.createContext({ window: {} });
  const workflows = loadWorkspaceFeatures(context);
  const handlers = new Map();
  const feature = context.window.PropertyDeskWorkspace.create({
    workflows,
    writeFeedback: workflows.writeFeedback,
    runAndRefreshWorkspaceChange: () => {},
    memberRepository: { addMember() {}, removeMember() {} },
    reminder: {
      $() {},
      state: {},
      esc() {},
      fmtDate() {},
      money() {},
      workflow: context.window.PropertyDeskWorkspaceReminderWorkflow,
    },
    $: (id) => ({
      addEventListener(event, handler) {
        handlers.set(`${id}:${event}`, handler);
      },
    }),
  });

  feature.attachProfileEvents();
  feature.attachWorkspaceMemberEvents();

  assert.deepEqual(Object.keys(feature).sort(), [
    "attachProfileEvents",
    "attachWorkspaceMemberEvents",
    "renderWorkspacePage",
    "updateGreeting",
  ]);
  assert.equal(typeof handlers.get("display-name-form:submit"), "function");
  assert.equal(typeof handlers.get("member-add-form:submit"), "function");
  assert.equal(typeof handlers.get("workspace-members:click"), "function");
});

test("adding a workspace member clears the address only after successful refresh", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "member-email" ? " spouse@example.test " : "",
        classList: { toggle() {} },
        addEventListener(eventName, handler) {
          handlers.set(`${id}:${eventName}`, handler);
        },
      });
    return elements.get(id);
  };
  const calls = [];
  const messages = [];
  const state = {
    client: {
      async rpc(name, args) {
        calls.push([name, args]);
        return { error: null };
      },
    },
    workspaceMembers: [],
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
  };
  const feature = context.window.PropertyDeskWorkspaceMembers.create({
    state,
    maintenanceWorkflow: context.window.PropertyDeskWorkspaceMemberMaintenance,
    runAndRefreshWorkspaceChange:
      createRepositoryWriteFeedback(context).runAndRefreshWorkspaceChange,
    view: context.window.PropertyDeskWorkspaceMembersView.create({
      $: element,
      state,
      esc: String,
    }),
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    refreshWorkspaceSettings: () => calls.push(["render-reminders"]),
    repository: context.window.PropertyDeskWorkspaceMemberRepository.create({
      getClient: () => state.client,
    }),
  });

  assert.deepEqual(Object.keys(feature), ["attachWorkspaceMemberEvents"]);
  feature.attachWorkspaceMemberEvents();
  await handlers.get("member-add-form:submit")({ preventDefault() {} });

  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], "pd_add_workspace_member");
  assert.equal(calls[0][1].p_email, "spouse@example.test");
  assert.equal(calls[1][0], "refresh");
  assert.equal(calls[2][0], "render-reminders");
  assert.equal(element("member-email").value, "");
  assert.equal(messages.at(-1), "Workspace member added");
});

test("adding a workspace member keeps the address when refresh fails", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "member-email" ? " spouse@example.test " : "",
        classList: { toggle() {} },
        addEventListener(eventName, handler) {
          handlers.set(`${id}:${eventName}`, handler);
        },
      });
    return elements.get(id);
  };
  const state = {
    client: { rpc: async () => ({ error: null }) },
    workspaceMembers: [],
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
  };
  const feature = context.window.PropertyDeskWorkspaceMembers.create({
    state,
    maintenanceWorkflow: context.window.PropertyDeskWorkspaceMemberMaintenance,
    runAndRefreshWorkspaceChange:
      createRepositoryWriteFeedback(context).runAndRefreshWorkspaceChange,
    view: context.window.PropertyDeskWorkspaceMembersView.create({
      $: element,
      state: {
        workspaceMembers: [],
        user: { id: "owner-1" },
        workspaceOwnerId: "owner-1",
      },
      esc: String,
    }),
    toast() {},
    fetchAll: async () => {
      throw new Error("offline");
    },
    refreshWorkspaceSettings() {},
    repository: context.window.PropertyDeskWorkspaceMemberRepository.create({
      getClient: () => state.client,
    }),
  });

  feature.attachWorkspaceMemberEvents();
  await handlers.get("member-add-form:submit")({ preventDefault() {} });

  assert.equal(element("member-email").value, " spouse@example.test ");
});

test("workspace setting writes report rejected requests and retain entered values", async () => {
  const context = vm.createContext({ window: {} });
  const workflows = loadWorkspaceFeatures(context);
  const elements = new Map([
    ["display-name", { value: "New Label" }],
    ["member-email", { value: " spouse@example.test " }],
  ]);
  let saveProfile;
  const memberHandlers = new Map();
  const $ = (id) => {
    if (id === "display-name-form") {
      return {
        addEventListener(eventName, handler) {
          assert.equal(eventName, "submit");
          saveProfile = handler;
        },
      };
    }
    if (id === "member-add-form" || id === "workspace-members") {
      return {
        addEventListener(eventName, handler) {
          memberHandlers.set(`${id}:${eventName}`, handler);
        },
      };
    }
    return elements.get(id);
  };
  const messages = [];
  const state = {
    client: {
      auth: {
        updateUser: async () => {
          throw new Error("offline");
        },
      },
      rpc: async () => {
        throw new Error("offline");
      },
    },
    workspaceMembers: [{ member_user_id: "member-1", display_name: "Member" }],
    reminderLogs: [],
    accounts: [],
    properties: [],
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    workflows,
    writeFeedback: workflows.writeFeedback,
    runAndRefreshWorkspaceChange:
      createRepositoryWriteFeedback(context).runAndRefreshWorkspaceChange,
    $,
    state,
    authClient: createAuthClient(context, state),
    esc: String,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      throw new Error("offline");
    },
    reminder: {
      $() {},
      state,
      esc() {},
      fmtDate() {},
      money() {},
      workflow: context.window.PropertyDeskWorkspaceReminderWorkflow,
    },
    memberRepository:
      context.window.PropertyDeskWorkspaceMemberRepository.create({
        getClient: () => state.client,
      }),
    confirmAction: () => true,
  });

  feature.attachProfileEvents();
  feature.attachWorkspaceMemberEvents();
  await assert.doesNotReject(saveProfile({ preventDefault() {} }));
  await assert.doesNotReject(
    memberHandlers.get("member-add-form:submit")({ preventDefault() {} }),
  );
  await assert.doesNotReject(
    memberHandlers.get("workspace-members:click")({
      target: {
        closest: (selector) =>
          selector === "[data-remove-member]"
            ? { dataset: { removeMember: "member-1" } }
            : null,
      },
    }),
  );
  assert.equal(state.user.user_metadata.display_name, "Owner");
  assert.equal($("display-name").value, "New Label");
  assert.equal($("member-email").value, " spouse@example.test ");
  assert.deepEqual(messages, [
    "Display name result couldn't be confirmed. Reload your profile before trying again.",
    "Workspace member addition result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
    "Workspace member removal result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
  ]);
});

test("workspace member actions reconcile lost responses against refreshed membership", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const calls = [];
  const messages = [];
  const handlers = {};
  const member = { member_user_id: "member-1", email: "spouse@example.test" };
  const state = { workspaceMembers: [], properties: [] };
  const feature = context.window.PropertyDeskWorkspaceMembers.create({
    state,
    maintenanceWorkflow: context.window.PropertyDeskWorkspaceMemberMaintenance,
    runAndRefreshWorkspaceChange:
      createRepositoryWriteFeedback(context).runAndRefreshWorkspaceChange,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      calls.push("refresh");
      state.workspaceMembers = state.pendingMembers;
    },
    view: {
      attachEvents: (actions) => Object.assign(handlers, actions),
    },
    refreshWorkspaceSettings: () => calls.push("render"),
    repository: {
      addMember: async () => {
        throw new Error("add response lost");
      },
      removeMember: async () => {
        throw new Error("remove response lost");
      },
    },
    confirmAction: () => true,
  });
  feature.attachWorkspaceMemberEvents();

  state.pendingMembers = [member];
  assert.equal(
    await handlers.addWorkspaceMember(" SPOUSE@example.test "),
    true,
  );
  state.pendingMembers = [];
  await handlers.removeWorkspaceMember("member-1");

  assert.deepEqual(calls, ["refresh", "render", "refresh", "render"]);
  assert.deepEqual(messages, [
    "Workspace member added",
    "Workspace access removed",
  ]);
});

test("workspace member feature loads before settings and is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/workspace-members-view.js") <
      html.indexOf("features/workspace-member-repository.js"),
    "workspace member view should load before its RPC workflow",
  );
  assert.match(worker, /'\.\/features\/workspace-members-view\.js'/);
  assert.ok(
    html.indexOf("features/workspace-member-repository.js") <
      html.indexOf("features/workspace-member-maintenance.js"),
  );
  assert.ok(
    html.indexOf("features/workspace-member-maintenance.js") <
      html.indexOf("features/workspace-members.js"),
  );
  assert.ok(
    html.indexOf("features/workspace-record-write-workflow.js") <
      html.indexOf("features/repository-write-feedback.js"),
    "record write workflow should load before shared write feedback",
  );
  assert.ok(
    html.indexOf("features/repository-write-feedback.js") <
      html.indexOf("features/workspace-members.js"),
    "shared write feedback should load before workspace member writes",
  );
  assert.match(worker, /'\.\/features\/repository-write-feedback\.js'/);
  assert.match(worker, /'\.\/features\/workspace-record-write-workflow\.js'/);
  assert.match(worker, /'\.\/features\/workspace-member-repository\.js'/);
  assert.match(worker, /'\.\/features\/workspace-member-maintenance\.js'/);
  assert.ok(
    html.indexOf("features/workspace-members.js") <
      html.indexOf("features/workspace.js"),
    "workspace member actions should load before Workspace settings",
  );
  assert.ok(
    html.indexOf("features/profile-settings-view.js") <
      html.indexOf("features/workspace-profile-workflow.js"),
    "profile settings view should load before the workspace coordinator",
  );
  assert.ok(
    html.indexOf("features/profile-display.js") <
      html.indexOf("features/workspace-profile-workflow.js"),
    "profile display should load before its workflow",
  );
  assert.ok(
    html.indexOf("features/workspace-profile-workflow.js") <
      html.indexOf("features/workspace.js"),
    "profile settings should be composed before the workspace screen",
  );
  assert.match(worker, /'\.\/features\/profile-settings-view\.js'/);
  assert.match(worker, /'\.\/features\/workspace-profile-workflow\.js'/);
  assert.match(worker, /'\.\/features\/workspace-members\.js'/);
});
