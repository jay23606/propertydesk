const assert = require("node:assert/strict");
const test = require("node:test");
const { loadWorkspaceFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  const workflows = loadWorkspaceFeatures(context);
  let memberOptions;
  let memberViewOptions;
  const memberView = context.window.PropertyDeskWorkspaceMembersView;
  context.window.PropertyDeskWorkspaceMembersView = {
    create(options) {
      memberViewOptions = options;
      return memberView.create(options);
    },
  };
  const workspaceMembers = context.window.PropertyDeskWorkspaceMembers;
  context.window.PropertyDeskWorkspaceMembers = {
    create(options) {
      memberOptions = options;
      return workspaceMembers.create(options);
    },
  };
  workflows.memberView = context.window.PropertyDeskWorkspaceMembersView;
  workflows.members = context.window.PropertyDeskWorkspaceMembers;
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
    workflows,
    $: element,
    getAccounts: () => [],
    getProperties: () => [],
    getReminderLogs: () => [],
    getUser: () => state.user,
    setUser() {},
    getWorkspaceMembers: () => state.workspaceMembers,
    getWorkspaceOwnerId: () => state.workspaceOwnerId,
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
    reminder: {
      $() {},
      esc() {},
      fmtDate() {},
      fmtDateTime() {},
      money() {},
      workflow: context.window.PropertyDeskWorkspaceReminderWorkflow,
    },
    memberRepository: { addMember() {}, removeMember() {} },
    confirmAction: () => true,
  });

  feature.renderWorkspacePage();

  assert.equal(element("display-name").value, "Owner");
  assert.match(element("workspace-members").innerHTML, /&lt;Owner&gt;/);
  assert.match(element("workspace-members").innerHTML, /Full workspace access/);
  assert.deepEqual(element("member-add-form").classList.lastToggle, [
    "hidden",
    false,
  ]);
  assert.equal(typeof memberViewOptions.esc, "function");
  assert.equal(typeof memberOptions.refreshWorkspaceSettings, "function");
  assert.equal(typeof memberOptions.repository.addMember, "function");

  element("display-name").value = "Unsaved label";
  memberOptions.refreshWorkspaceSettings();
  assert.equal(element("display-name").value, "Owner");
});

test("workspace member view exposes only rendering and event binding", () => {
  const context = vm.createContext({ window: {} });
  loadWorkspaceFeatures(context);
  const view = context.window.PropertyDeskWorkspaceMembersView.create({
    $: () => ({}),
    state: { workspaceMembers: [] },
    esc: String,
  });

  assert.deepEqual(Object.keys(view).sort(), [
    "attachEvents",
    "renderWorkspaceMembers",
  ]);
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
    getActivityData: () => state,
  });
  const feature = context.window.PropertyDeskReminderActivityView.create({
    $,
    model,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    fmtDate: () => "Oct 2026",
    fmtDateTime: (value) => `local:${value}`,
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
  assert.match(html, /local:2026-10-31T12:00:00Z/);
});
