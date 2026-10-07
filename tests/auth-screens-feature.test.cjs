const assert = require("node:assert/strict");
const test = require("node:test");
const { loadAuthFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("authentication screens own sign-in, workspace, and configuration presentation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "auth-screens.js"),
      "utf8",
    ),
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
  assert.match(
    element("config-banner").innerHTML,
    /Supabase is not configured/,
  );
  assert.equal(element("auth-title").textContent, "Connect your workspace");
  assert.equal(element("auth-form").classes.has("hidden"), true);
  assert.equal(element(".privacy-note").classes.has("hidden"), true);
  assert.equal(element("auth-view").classes.has("hidden"), false);
});

test("password reset requests keep generic feedback and restore the submit control", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  loadAuthFeatures(context);
  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "owner@example.com",
        disabled: false,
        textContent: "",
        reportValidity: () => true,
        addEventListener: (event, handler) =>
          handlers.set(`${id}:${event}`, handler),
      });
    }
    return elements.get(id);
  };
  const resetCalls = [];
  const state = {
    client: {
      auth: {
        async resetPasswordForEmail(...args) {
          resetCalls.push(args);
          return { error: { message: "account-specific failure" } };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskAuthRecovery.create({
    $: element,
    state,
    authClient: context.window.PropertyDeskAuthClient.create({
      getClient: () => state.client,
    }),
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

  assert.deepEqual(Object.keys(feature).sort(), [
    "attachEvents",
    "isPasswordRecoverySession",
    "showPasswordReset",
  ]);
  feature.attachEvents();
  await handlers.get("forgot-password:click")();

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
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/auth-screens.js") < html.indexOf("features/auth.js"),
  );
  assert.match(worker, /'\.\/features\/auth-screens\.js'/);
});
