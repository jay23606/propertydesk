const assert = require("node:assert/strict");
const test = require("node:test");
const { loadWorkspaceFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
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
  let remindersRendered = false;
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
    updateGreeting() {},
    renderReminderActivity: () => {
      remindersRendered = true;
    },
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
  assert.equal(remindersRendered, true);
});

test("reminder activity view summarizes delivery results and escapes log data", () => {
  const context = vm.createContext({ window: {} });
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
  const feature = context.window.PropertyDeskReminderActivityView.create({
    $,
    state: {
      accounts: [
        { id: "account-1", property_id: "property-1", party_name: "<Buyer>" },
      ],
      properties: [{ id: "property-1", address: "<10 Main St>" }],
      reminderLogs: [
        {
          account_id: "account-1",
          reminder_month: "2026-10-01",
          recipient_email: "buyer@example.test",
          status: "failed",
          reason: "mailersend_http_403",
          unpaid_due: 550,
          attempted_at: "2026-10-31T12:00:00Z",
        },
      ],
    },
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    fmtDate: () => "Oct 2026",
    money: (value) => `$${Number(value).toFixed(2)}`,
  });

  feature.renderReminderActivity();
  const html = $("reminder-activity").innerHTML;
  assert.match(html, /&lt;10 Main St&gt;/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.match(html, /buyer@example\.test/);
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

  feature.attachEvents();

  assert.equal(typeof handlers.get("display-name-form:submit"), "function");
  assert.equal(typeof handlers.get("member-add-form:submit"), "function");
  assert.equal(typeof handlers.get("workspace-members:click"), "function");
});

test("adding a workspace member clears the address only after successful refresh", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "member-email" ? " spouse@example.test " : "",
        classList: { toggle() {} },
      });
    return elements.get(id);
  };
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state: {
      client: {
        async rpc(name, args) {
          calls.push([name, args]);
          return { error: null };
        },
      },
      workspaceMembers: [],
      user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
      workspaceOwnerId: "owner-1",
    },
    esc: String,
    renderReminderActivity: () => calls.push(["render-reminders"]),
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    updateGreeting() {},
  });

  await feature.addWorkspaceMember({ preventDefault() {} });

  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], "pd_add_workspace_member");
  assert.equal(calls[0][1].p_email, "spouse@example.test");
  assert.equal(calls[1][0], "refresh");
  assert.equal(calls[2][0], "render-reminders");
  assert.equal(element("display-name").value, "Owner");
  assert.equal(element("member-email").value, "");
  assert.equal(messages.at(-1), "Workspace member added");
});

test("workspace setting writes report rejected requests and retain entered values", async () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const elements = new Map([
    ["display-name", { value: "New Label" }],
    ["member-email", { value: " spouse@example.test " }],
  ]);
  const $ = (id) => elements.get(id);
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
    fmtDate: () => "",
    money: () => "",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected request must not refresh"),
    updateGreeting: () =>
      assert.fail("a rejected profile save must not update the greeting"),
    confirmAction: () => true,
  });
  const profile = context.window.PropertyDeskProfileSettings.create({
    $,
    state,
    toast: (message) => messages.push(message),
    updateGreeting: () =>
      assert.fail("a rejected profile save must not update the greeting"),
  });

  await assert.doesNotReject(profile.saveProfile({ preventDefault() {} }));
  await assert.doesNotReject(
    feature.addWorkspaceMember({ preventDefault() {} }),
  );
  await assert.doesNotReject(feature.removeWorkspaceMember("member-1"));
  assert.equal(state.user.user_metadata.display_name, "Owner");
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
    html.indexOf("features/workspace-members.js") <
      html.indexOf("features/workspace.js"),
    "workspace members should load before the settings coordinator",
  );
  assert.match(worker, /'\.\/features\/workspace-members\.js'/);
});
