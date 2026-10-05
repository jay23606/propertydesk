const assert = require("node:assert/strict");
const test = require("node:test");
const { loadAuthFeatures, loadWorkspaceFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("password reset requests keep generic feedback and restore the submit control", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "owner@example.com",
        disabled: false,
        textContent: "",
        reportValidity: () => true,
      });
    }
    return elements.get(id);
  };
  const resetCalls = [];
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state: {
      client: {
        auth: {
          async resetPasswordForEmail(...args) {
            resetCalls.push(args);
            return { error: { message: "account-specific failure" } };
          },
        },
      },
    },
    fetchAll: async () => {},
    toast() {},
    setAuthMode() {},
    startWorkspace: async () => {},
    showAuth() {},
    windowRef: {
      location: { origin: "https://example.test", pathname: "/propertydesk/" },
    },
    documentRef: {},
  });

  await feature.requestPasswordReset();

  assert.equal(resetCalls.length, 1);
  assert.equal(resetCalls[0][0], "owner@example.com");
  assert.equal(
    resetCalls[0][1].redirectTo,
    "https://example.test/propertydesk/",
  );
  assert.equal(
    element("auth-message").textContent,
    "Unable to request a reset right now. Try again later.",
  );
  assert.equal(element("forgot-password").disabled, false);
});

test("password recovery saves the new password before resuming workspace access", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "",
        disabled: false,
        textContent: "",
      });
    }
    return elements.get(id);
  };
  element("reset-password").value = "new-password-value";
  element("reset-password-confirm").value = "new-password-value";
  const calls = [];
  const state = {
    user: { id: "old-user" },
    passwordRecoveryInProgress: true,
    client: {
      auth: {
        async updateUser(payload) {
          calls.push(["update", payload]);
          return { data: { user: { id: "updated-user" } }, error: null };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state,
    toast: (message) => calls.push(["toast", message]),
    setAuthMode: (signup) => calls.push(["auth-mode", signup]),
    startWorkspace: async () => calls.push(["workspace"]),
    showAuth() {},
    windowRef: {
      location: { pathname: "/propertydesk/", search: "?from=reset" },
      history: { replaceState: (...args) => calls.push(["history", ...args]) },
    },
  });

  await feature.submitPasswordReset({ preventDefault() {} });

  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][1].password, "new-password-value");
  assert.deepEqual(calls.at(-3), ["auth-mode", false]);
  assert.deepEqual(calls.at(-2), ["workspace"]);
  assert.deepEqual(calls.at(-1), ["toast", "Password updated"]);
  assert.equal(state.user.id, "updated-user");
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(element("reset-password-submit").disabled, false);
  assert.equal(element("reset-password-submit").textContent, "Update password");
});

test("password recovery restores its submit control when the auth request rejects", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "new-password-value",
        disabled: false,
        textContent: "",
      });
    return elements.get(id);
  };
  element("reset-password-confirm").value = "new-password-value";
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state: {
      user: { id: "owner-1" },
      passwordRecoveryInProgress: true,
      client: {
        auth: {
          async updateUser() {
            throw new Error("network unavailable");
          },
        },
      },
    },
    toast() {},
    setAuthMode() {},
    startWorkspace: async () => {},
    showAuth() {},
    windowRef: { location: { pathname: "/propertydesk/", search: "" } },
  });

  await assert.doesNotReject(
    feature.submitPasswordReset({ preventDefault() {} }),
  );
  assert.equal(element("reset-password-submit").disabled, false);
  assert.equal(element("reset-password-submit").textContent, "Update password");
  assert.match(element("auth-message").textContent, /try again/i);
});

test("auth feature delegates session restoration and state changes to its session module", async () => {
  const context = vm.createContext({ window: {}, URLSearchParams });
  loadAuthFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        textContent: "",
        dataset: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
        },
      });
    return elements.get(id);
  };
  const state = {
    user: null,
    passwordRecoveryInProgress: false,
    client: {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: "reset-token",
                user: { id: "owner-1" },
              },
            },
          };
        },
      },
    },
  };
  const calls = [];
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state,
    fetchAll: async () => calls.push("fetch-workspace"),
    toast() {},
    windowRef: {
      location: { hash: "#type=recovery&access_token=reset-token" },
    },
    documentRef: { querySelector: () => element("auth-intro") },
  });

  await feature.restoreAuthSession();
  assert.equal(state.user.id, "owner-1");
  assert.equal(state.passwordRecoveryInProgress, true);
  assert.equal(element("auth-title").textContent, "Choose a new password");
  assert.deepEqual(calls, []);

  feature.handleAuthStateChange("SIGNED_OUT");
  assert.equal(state.user, null);
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(state.properties.length, 0);
  assert.equal(state.documents.length, 0);
  assert.equal(element("auth-form").dataset.mode, "signin");

  feature.handleAuthStateChange("SIGNED_IN", { user: { id: "owner-2" } });
  assert.equal(state.user.id, "owner-2");
  assert.deepEqual(calls, ["fetch-workspace"]);
});

test("auth feature owns login controls and clears workspace data on sign-out", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const handlers = new Map();
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        textContent: "",
        autocomplete: "",
        dataset: { mode: "signup" },
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    return elements.get(id);
  };
  let signOutCalls = 0;
  const state = {
    user: { id: "owner-1" },
    workspaceOwnerId: "owner-1",
    workspaceMembers: [{ id: "member-1" }],
    propertyHolders: [{ id: "holder-1" }],
    depositEntries: [{ id: "deposit-1" }],
    reminderLogs: [{ id: "reminder-1" }],
    properties: [{ id: "property-1" }],
    accounts: [{ id: "account-1" }],
    payments: [{ id: "payment-1" }],
    expenses: [{ id: "expense-1" }],
    documents: [{ id: "document-1" }],
    agreementVersions: [{ id: "agreement-version-1" }],
    importBatches: [{ id: "import-batch-1" }],
    pendingImport: { id: "pending-import" },
    pendingCorrection: { id: "pending-correction" },
    editingProperty: { id: "editing-property" },
    editingAccount: { id: "editing-account" },
    selectedPropertyId: "property-1",
    auditRequestId: 3,
    passwordRecoveryInProgress: true,
    client: { auth: { async signOut() { signOutCalls += 1; } } },
  };
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state,
    fetchAll: async () => {},
    toast() {},
    documentRef: { querySelector: () => element("auth-intro") },
  });

  feature.attachEvents();
  for (const key of [
    "sign-out:click",
    "auth-toggle:click",
    "auth-form:submit",
    "forgot-password:click",
    "password-reset-form:submit",
    "reset-password-cancel:click",
  ]) {
    assert.equal(typeof handlers.get(key), "function", key);
  }

  await handlers.get("sign-out:click")();
  assert.equal(signOutCalls, 1);
  assert.equal(state.user, null);
  assert.equal(state.properties.length, 0);
  assert.equal(state.accounts.length, 0);
  assert.equal(state.payments.length, 0);
  for (const key of [
    "workspaceMembers", "propertyHolders", "depositEntries", "reminderLogs",
    "expenses", "documents", "agreementVersions", "importBatches",
  ]) assert.equal(state[key].length, 0, key);
  assert.equal(state.workspaceOwnerId, null);
  assert.equal(state.pendingImport, null);
  assert.equal(state.pendingCorrection, null);
  assert.equal(state.editingProperty, null);
  assert.equal(state.editingAccount, null);
  assert.equal(state.selectedPropertyId, null);
  assert.equal(state.auditRequestId, 4);
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(element("auth-form").dataset.mode, "signin");
});

test("auth feature restores login controls when the auth request rejects", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "auth-email" ? "owner@example.com" : "secret",
        textContent: "",
        disabled: false,
        autocomplete: "",
        dataset: { mode: "signin" },
        classList: { add() {}, remove() {}, toggle() {} },
      });
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state: {
      user: null,
      passwordRecoveryInProgress: false,
      client: {
        auth: {
          async signInWithPassword() {
            throw new Error("network unavailable");
          },
        },
      },
    },
    fetchAll: async () => {},
    toast() {},
    documentRef: { querySelector: () => element("auth-intro") },
  });

  await assert.doesNotReject(
    feature.submitAuth({ preventDefault() {} }),
  );
  assert.equal(element("auth-submit").disabled, false);
  assert.equal(element("auth-submit").textContent, "Sign in");
  assert.match(element("auth-message").textContent, /try again/i);
});

test("auth form sends sign-in to the workspace and asks unconfirmed sign-ups to verify", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth-form.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "auth-email" ? "owner@example.com" : "secret",
        textContent: "",
        disabled: false,
        autocomplete: "",
        dataset: { mode: "signin" },
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    return elements.get(id);
  };
  const state = {
    user: null,
    client: {
      auth: {
        async signInWithPassword(credentials) {
          assert.equal(credentials.email, "owner@example.com");
          assert.equal(credentials.password, "secret");
          return { data: { user: { id: "owner-1" } }, error: null };
        },
        async signUp() {
          return { data: { user: { id: "owner-2" }, session: null }, error: null };
        },
      },
    },
  };
  let workspaceStarts = 0;
  const form = context.window.PropertyDeskAuthForm.create({
    $: element,
    state,
    startWorkspace: async () => { workspaceStarts += 1; },
    documentRef: { querySelector: () => element("auth-intro") },
  });
  form.attachEvents();

  await handlers.get("auth-form:submit")({ preventDefault() {} });
  assert.equal(state.user.id, "owner-1");
  assert.equal(workspaceStarts, 1);
  assert.equal(element("auth-submit").disabled, false);

  form.setAuthMode(true);
  await handlers.get("auth-form:submit")({ preventDefault() {} });
  assert.match(element("auth-message").textContent, /confirm your account/i);
  assert.equal(workspaceStarts, 1);
});

test("auth session restore and sign-out report rejected requests without clearing user state", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const messages = [];
  const visible = [];
  const element = () => ({
    classList: {
      add: () => visible.push("hidden"),
      remove: () => visible.push("shown"),
      toggle() {},
    },
    dataset: {},
    textContent: "",
  });
  const state = {
    user: { id: "owner-1" },
    passwordRecoveryInProgress: false,
    client: {
      auth: {
        signOut: async () => { throw new Error("offline"); },
        getSession: async () => { throw new Error("offline"); },
      },
    },
  };
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state,
    fetchAll: async () => assert.fail("session failure must not load records"),
    toast: (message) => messages.push(message),
    documentRef: { querySelector: () => element() },
  });

  await assert.doesNotReject(feature.signOut());
  assert.equal(state.user.id, "owner-1");
  await assert.doesNotReject(feature.restoreAuthSession());
  assert.equal(state.user.id, "owner-1");
  assert.ok(visible.includes("shown"));
  assert.deepEqual(messages, [
    "Unable to sign out right now. Check your connection and try again.",
    "Unable to restore your session right now. Check your connection and try again.",
  ]);
});

test("navigation owns page routing and workspace settings navigation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "navigation.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const classes = new Set();
  const makeElement = (id, dataset = {}) => ({
    id,
    dataset,
    textContent: "",
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(`${id}:${name}`);
        else classes.delete(`${id}:${name}`);
      },
    },
    addEventListener(name, handler) {
      handlers.set(`${id}:${name}`, handler);
    },
  });
  const propertiesPage = makeElement("page-properties");
  const workspacePage = makeElement("page-workspace");
  const reportsPage = makeElement("page-reports");
  const propertiesLink = makeElement("properties-link", { view: "properties" });
  const reportsLink = makeElement("reports-link", { view: "reports" });
  const workspaceLink = makeElement("workspace-link", { view: "workspace" });
  const gotoLink = makeElement("goto-link", { goto: "reports" });
  const userMenu = makeElement("user-menu");
  const selectors = {
    ".page": [propertiesPage, workspacePage, reportsPage],
    ".nav-link": [propertiesLink, reportsLink, workspaceLink],
    "[data-goto]": [gotoLink],
  };
  const documentRef = {
    querySelectorAll: (selector) => selectors[selector] || [],
  };
  const routes = [];
  const state = { view: "properties" };
  const crumb = { textContent: "" };
  const feature = context.window.PropertyDeskNavigation.create({
    $: (id) =>
      id === "page-crumb" ? crumb : id === "user-menu" ? userMenu : null,
    state,
    renderWorkspaceSettings: () => routes.push("workspace-settings"),
    documentRef,
    windowRef: { scrollTo: () => routes.push("scroll") },
  });

  feature.attachEvents();
  handlers.get("workspace-link:click")();
  assert.equal(state.view, "workspace");
  assert.equal(crumb.textContent, "Workspace");
  assert.ok(classes.has("page-properties:active") === false);
  assert.ok(classes.has("page-workspace:active"));
  assert.ok(classes.has("page-reports:active") === false);
  assert.ok(classes.has("workspace-link:active"));
  assert.deepEqual(routes.slice(0, 2), ["workspace-settings", "scroll"]);

  handlers.get("goto-link:click")();
  assert.equal(state.view, "reports");
  handlers.get("user-menu:click")();
  assert.equal(state.view, "workspace");
  assert.deepEqual(routes.slice(-2), ["workspace-settings", "scroll"]);
});

test("theme controller synchronizes toggles and persists theme changes", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "theme-controller.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const attributes = {};
  const labels = [];
  const icons = [];
  const makeToggle = (id) => ({
    setAttribute(name, value) {
      attributes[`${id}:${name}`] = value;
    },
    addEventListener(name, handler) {
      handlers.set(`${id}:${name}`, handler);
    },
    querySelector(selector) {
      return selector === ".theme-label"
        ? labels[id]
        : selector === ".theme-icon"
          ? icons[id]
          : null;
    },
  });
  const toggles = [makeToggle(0), makeToggle(1)];
  labels.push({ textContent: "" }, { textContent: "" });
  icons.push({ textContent: "" }, { textContent: "" });
  const meta = { setAttribute: (name, value) => (attributes[`meta:${name}`] = value) };
  const documentRef = {
    documentElement: { dataset: { theme: "dark" } },
    querySelector: (selector) => selector === 'meta[name="theme-color"]' ? meta : null,
    querySelectorAll: (selector) => selector === "[data-theme-toggle]" ? toggles : [],
  };
  const storageWrites = [];
  const theme = context.window.PropertyDeskTheme.create({
    documentRef,
    windowRef: {},
    storage: { setItem: (...args) => storageWrites.push(args) },
  });

  theme.attachEvents();
  assert.equal(attributes["0:aria-label"], "Switch to light mode");
  assert.equal(attributes["0:aria-pressed"], "true");
  assert.equal(labels[0].textContent, "Light mode");
  assert.equal(icons[0].textContent, "☼");
  assert.equal(attributes["meta:content"], "#151b17");

  handlers.get("0:click")();
  assert.equal(documentRef.documentElement.dataset.theme, "light");
  assert.equal(attributes["meta:content"], "#f6f7f4");
  assert.equal(attributes["1:aria-label"], "Switch to dark mode");
  assert.equal(labels[1].textContent, "Dark mode");
  assert.equal(icons[1].textContent, "☾");
  assert.deepEqual(storageWrites, [["propertydesk-theme", "light"]]);
});

test("navigation feature loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/navigation.js") < html.indexOf("app.js"),
    "navigation should load before the app coordinator",
  );
  assert.match(worker, /'\.\/features\/navigation\.js'/);
});

test("theme controller loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(html.indexOf("features/theme-controller.js") < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/theme-controller\.js'/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"), /PropertyDeskAppShellWorkflow\.create/);
});

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
    renderReminderActivity: () => { remindersRendered = true; },
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
    fs.readFileSync(path.join(__dirname, "..", "features", "reminder-activity-view.js"), "utf8"),
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
      accounts: [{ id: "account-1", property_id: "property-1", party_name: "<Buyer>" }],
      properties: [{ id: "property-1", address: "<10 Main St>" }],
      reminderLogs: [{
        account_id: "account-1",
        reminder_month: "2026-10-01",
        recipient_email: "buyer@example.test",
        status: "failed",
        reason: "mailersend_http_403",
        unpaid_due: 550,
        attempted_at: "2026-10-31T12:00:00Z",
      }],
    },
    esc: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
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
      auth: { updateUser: async () => { throw new Error("offline"); } },
      rpc: async () => { throw new Error("offline"); },
    },
    workspaceMembers: [{ member_user_id: "member-1", display_name: "Member" }],
    reminderLogs: [],
    accounts: [],
    properties: [],
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    $, state, esc: String, fmtDate: () => "", money: () => "",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected request must not refresh"),
    updateGreeting: () => assert.fail("a rejected profile save must not update the greeting"),
    confirmAction: () => true,
  });
  const profile = context.window.PropertyDeskProfileSettings.create({
    $, state, toast: (message) => messages.push(message),
    updateGreeting: () => assert.fail("a rejected profile save must not update the greeting"),
  });

  await assert.doesNotReject(profile.saveProfile({ preventDefault() {} }));
  await assert.doesNotReject(feature.addWorkspaceMember({ preventDefault() {} }));
  await assert.doesNotReject(feature.removeWorkspaceMember("member-1"));
  assert.equal(state.user.user_metadata.display_name, "Owner");
  assert.equal($("member-email").value, " spouse@example.test ");
  assert.deepEqual(messages, [
    "Display name couldn't be saved right now. Check your connection and try again.",
    "Workspace member couldn't be added right now. Check your connection and try again.",
    "Workspace member couldn't be removed right now. Check your connection and try again.",
  ]);
});

test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-quick-note.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const messages = [];
  let refreshed = false;
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [
      { id: "property-1", address: "10 Main St", notes: "Old note" },
    ],
    client: {
      from(table) {
        assert.equal(table, "pd_properties");
        return {
          update(values) {
            updates.push(values);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq: async (ownerColumn, ownerId) => {
                    updates.push([ownerColumn, ownerId]);
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskPropertyQuickNote.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshed = true;
    },
    streetAddress: (property) => property.address,
    promptAction: () => "  Follow-up\n needed   soon ",
  });

  await feature.editPropertyQuickNote("property-1");

  assert.equal(updates[0].notes, "Follow-up needed soon");
  assert.equal(updates[1][0], "id");
  assert.equal(updates[1][1], "property-1");
  assert.equal(updates[2][0], "user_id");
  assert.equal(updates[2][1], "workspace-1");
  assert.equal(refreshed, true);
  assert.equal(messages.at(-1), "Property note saved");
});

test("property quick notes enforce the character limit before writing", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-quick-note.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const state = {
    properties: [{ id: "property-1", address: "10 Main St" }],
    client: { from: () => assert.fail("an overlong note must not write") },
  };
  const feature = context.window.PropertyDeskPropertyQuickNote.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("an overlong note must not refresh"),
    streetAddress: (property) => property.address,
    promptAction: () => "x".repeat(141),
  });

  await assert.doesNotReject(feature.editPropertyQuickNote("property-1"));
  assert.deepEqual(messages, ["Quick notes are limited to 140 characters."]);
});

test("property administration workflows report rejected writes without running success actions", async () => {
  const context = vm.createContext({ window: {}, document: { querySelectorAll: () => [] } });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-management.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const rejectingQuery = () => {
    let filters = 0;
    const query = {
      eq() {
        filters += 1;
        return filters === 2 ? Promise.reject(new Error("offline")) : query;
      },
    };
    return query;
  };
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [{ id: "property-1", address: "10 Main St", archived_at: null }],
    client: {
      from() {
        return {
          update() {
            return rejectingQuery();
          },
          delete() {
            return rejectingQuery();
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskPropertyManagement.create({
    $() {},
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected write must not refresh"),
    todayIso: () => "2026-10-05",
    openPropertyDetails: () => assert.fail("a rejected write must not reopen details"),
  });

  await assert.doesNotReject(feature.savePropertyHolders());
  await assert.doesNotReject(feature.toggleArchiveProperty());
  assert.deepEqual(messages, [
    "Account-holder labels couldn't be saved right now. Check your connection and try again.",
    "Property status couldn't be updated right now. Check your connection and try again.",
  ]);
});

test("quick note feature loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-quick-note.js") < html.indexOf("app.js"),
    "property quick note should load before the app coordinator",
  );
  assert.match(worker, /'\.\/features\/property-quick-note\.js'/);
});

test("workspace member feature loads before settings and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/workspace-members.js") < html.indexOf("features/workspace.js"),
    "workspace members should load before the settings coordinator",
  );
  assert.match(worker, /'\.\/features\/workspace-members\.js'/);
});

test("local browser scripts exist and are precached except runtime config", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const shellFiles = new Set(
    [...worker.matchAll(/['"]\.\/([^'"]+)['"]/g)].map((match) => match[1]),
  );
  assert.equal(shellFiles.has("config.js"), false, "runtime Supabase config should stay outside the cache");
  const localScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1].split(/[?#]/, 1)[0])
    .filter((src) => src.endsWith(".js") && !/^https?:\/\//i.test(src));

  for (const src of localScripts) {
    if (src === "config.js") continue;
    assert.ok(fs.existsSync(path.join(root, src)), `${src} should exist`);
    assert.ok(shellFiles.has(src), `${src} should be precached`);
  }
});
