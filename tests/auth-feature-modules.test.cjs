const assert = require("node:assert/strict");
const test = require("node:test");
const { loadAuthFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("authentication screens own sign-in, workspace, and configuration presentation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth-screens.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        classes,
        classList: {
          add: (value) => classes.add(value),
          remove: (value) => classes.delete(value),
        },
        textContent: "",
        innerHTML: "",
      });
    }
    return elements.get(id);
  };
  const documentRef = { querySelector: element };
  const screens = context.window.PropertyDeskAuthScreens.create({
    $: element,
    documentRef,
  });

  screens.showAuth();
  assert.equal(element("auth-view").classes.has("hidden"), false);
  assert.equal(element("app-view").classes.has("hidden"), true);
  screens.showApp();
  assert.equal(element("auth-view").classes.has("hidden"), true);
  assert.equal(element("app-view").classes.has("hidden"), false);
  screens.showConfigError();
  assert.match(element("config-banner").innerHTML, /Supabase is not configured/);
  assert.equal(element("auth-title").textContent, "Connect your workspace");
  assert.equal(element("auth-form").classes.has("hidden"), true);
  assert.equal(element(".privacy-note").classes.has("hidden"), true);
  assert.equal(element("auth-view").classes.has("hidden"), false);
});


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


test("authentication screen module loads before auth and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(html.indexOf("features/auth-screens.js") < html.indexOf("features/auth.js"));
  assert.match(worker, /'\.\/features\/auth-screens\.js'/);
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

