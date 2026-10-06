const assert = require("node:assert/strict");
const test = require("node:test");
const { loadWorkspaceFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  let memberOptions;
  const workspaceMembers = context.window.PropertyDeskWorkspaceMembers;
  context.window.PropertyDeskWorkspaceMembers = {
    create(options) {
      memberOptions = options;
      return workspaceMembers.create(options);
    },
  };
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        innerHTML: "",
        classList: {
          toggle(name, hidden) {
            this.lastToggle = [name, hidden];
          },
        },
      });
    return elements.get(id);
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
    workspaceMembers: [
      {
        member_user_id: "owner-1",
        display_name: "<Owner>",
        email: "owner@example.test",
        is_owner: true,
      },
      {
        member_user_id: "member-1",
        display_name: "Member",
        email: "member@example.test",
        is_owner: false,
      },
    ],
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state,
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    toast() {},
    fetchAll: async () => {},
    confirmAction: () => true,
  });

  feature.renderWorkspaceSettings();

  assert.equal(element("display-name").value, "Owner");
  assert.match(element("workspace-members").innerHTML, /&lt;Owner&gt;/);
  assert.match(element("workspace-members").innerHTML, /Full workspace access/);
  assert.deepEqual(element("member-add-form").classList.lastToggle, [
    "hidden",
    false,
  ]);
  assert.equal(typeof memberOptions.view.renderWorkspaceMembers, "function");
  assert.equal(typeof memberOptions.refreshWorkspaceSettings, "function");

  element("display-name").value = "Unsaved label";
  memberOptions.refreshWorkspaceSettings();
  assert.equal(element("display-name").value, "Owner");
});

test("profile settings view reads a trimmed name and prevents a page submit", () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const handlers = new Map();
  const elements = new Map([
    ["display-name", { value: "  Workspace label  " }],
    [
      "display-name-form",
      {
        addEventListener(eventName, handler) {
          handlers.set(eventName, handler);
        },
      },
    ],
  ]);
  const view = context.window.PropertyDeskProfileSettingsView.create({
    $: (id) => elements.get(id),
  });
  const received = [];
  let prevented = false;

  view.attachEvents((name) => received.push(name));
  handlers.get("submit")({
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.deepEqual(received, ["Workspace label"]);
  view.setDisplayName("Saved label");
  assert.equal(elements.get("display-name").value, "Saved label");
});

test("reminder activity view summarizes delivery results and escapes log data", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-activity-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-activity-view.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { innerHTML: "" });
    return elements.get(id);
  };
  const state = {
    accounts: [
      { id: "account-1", property_id: "property-1", party_name: "<Buyer>" },
    ],
    properties: [{ id: "property-1", address: "<10 Main St>" }],
    reminderLogs: [
      {
        account_id: "account-1",
        reminder_month: "2026-10-01",
        recipient_index: 1,
        recipient_email: "buyer@example.test",
        status: "failed",
        reason: "mailersend_http_403",
        unpaid_due: 550,
        attempted_at: "2026-10-31T12:00:00Z",
      },
    ],
  };
  const model = context.window.PropertyDeskReminderActivityModel.create({
    state,
  });
  const feature = context.window.PropertyDeskReminderActivityView.create({
    $,
    model,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    fmtDate: () => "Oct 2026",
    money: (value) => `$${Number(value).toFixed(2)}`,
  });

  feature.renderReminderActivity();
  const html = $("reminder-activity").innerHTML;
  assert.match(html, /&lt;10 Main St&gt;/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.match(html, /Recipient 1/);
  assert.doesNotMatch(html, /buyer@example\.test/);
  assert.match(html, /MailerSend rejected the request/);
  assert.match(html, /Unpaid due: \$550\.00/);
  assert.match(html, /reminder-failed/);
});

test("workspace feature owns profile and member form bindings", () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const handlers = new Map();
  const feature = context.window.PropertyDeskWorkspace.create({
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
    "renderWorkspaceSettings",
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
    view: context.window.PropertyDeskWorkspaceMembersView.create({
      $: element,
      state,
      esc: String,
    }),
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    refreshWorkspaceSettings: () => calls.push(["render-reminders"]),
  });

  assert.deepEqual(Object.keys(feature).sort(), [
    "attachEvents",
    "renderWorkspaceMembers",
  ]);
  feature.attachEvents();
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
  const feature = context.window.PropertyDeskWorkspaceMembers.create({
    state: {
      client: { rpc: async () => ({ error: null }) },
      workspaceMembers: [],
      user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
      workspaceOwnerId: "owner-1",
    },
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
  });

  feature.attachEvents();
  await handlers.get("member-add-form:submit")({ preventDefault() {} });

  assert.equal(element("member-email").value, " spouse@example.test ");
});

test("workspace setting writes report rejected requests and retain entered values", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
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
    $,
    state,
    esc: String,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected request must not refresh"),
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
    "Display name couldn't be saved right now. Check your connection and try again.",
    "Workspace member couldn't be added right now. Check your connection and try again.",
    "Workspace member couldn't be removed right now. Check your connection and try again.",
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
      html.indexOf("features/workspace-members.js"),
  );
  assert.ok(
    html.indexOf("features/repository-write-feedback.js") <
      html.indexOf("features/workspace-members.js"),
    "shared write feedback should load before workspace member writes",
  );
  assert.match(worker, /'\.\/features\/repository-write-feedback\.js'/);
  assert.match(worker, /'\.\/features\/workspace-member-repository\.js'/);
  assert.ok(
    html.indexOf("features/workspace-members.js") <
      html.indexOf("features/workspace.js"),
    "workspace members should load before the settings coordinator",
  );
  assert.ok(
    html.indexOf("features/profile-settings-view.js") <
      html.indexOf("features/workspace.js"),
    "profile settings view should load before the workspace coordinator",
  );
  assert.match(worker, /'\.\/features\/profile-settings-view\.js'/);
  assert.ok(
    html.indexOf("features/profile-display.js") <
      html.indexOf("features/workspace.js"),
    "profile display should load before the settings coordinator",
  );
  assert.match(worker, /'\.\/features\/workspace-members\.js'/);
});
