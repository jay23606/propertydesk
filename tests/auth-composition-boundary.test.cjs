const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("auth coordinator gives each child only the auth operations it uses", () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/auth.js"), "utf8"),
    context,
  );

  const received = {};
  const authClient = Object.fromEntries(
    [
      "signUp",
      "signInWithPassword",
      "resetPasswordForEmail",
      "updateUser",
      "getSession",
      "signOut",
      "getUser",
      "onAuthStateChange",
    ].map((method) => [method, () => method]),
  );
  const modules = {
    screens: {
      create: () => ({
        showAuth() {},
        showApp() {},
        showConfigError() {},
      }),
    },
    form: {
      create: (options) => {
        received.form = options.authClient;
        return { setAuthMode() {}, attachEvents() {} };
      },
    },
    recovery: {
      create: (options) => {
        received.recovery = options.authClient;
        return {
          showPasswordReset() {},
          isPasswordRecoverySession() {},
          attachEvents() {},
        };
      },
    },
    session: {
      create: (options) => {
        received.session = options.authClient;
        return {
          handleAuthStateChange() {},
          restoreAuthSession() {},
          signOut() {},
        };
      },
    },
  };

  context.window.PropertyDeskAuth.create({
    $: () => ({ addEventListener() {} }),
    authClient,
    modules,
  });

  assert.deepEqual(Object.keys(received.form).sort(), [
    "signInWithPassword",
    "signUp",
  ]);
  assert.deepEqual(Object.keys(received.recovery).sort(), [
    "resetPasswordForEmail",
    "updateUser",
  ]);
  assert.deepEqual(Object.keys(received.session).sort(), [
    "getSession",
    "signOut",
  ]);
  for (const child of Object.values(received)) {
    assert.equal("getUser" in child, false);
    assert.equal("onAuthStateChange" in child, false);
  }
});

test("password reset request receives only its reset operation", () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/auth-recovery.js"), "utf8"),
    context,
  );

  let resetRequestClient;
  context.window.PropertyDeskAuthRecovery.create({
    $: () => ({}),
    getUser() {},
    setUser() {},
    setPasswordRecoveryInProgress() {},
    authClient: {
      resetPasswordForEmail() {},
      updateUser() {},
      signOut() {},
    },
    toast() {},
    setAuthMode() {},
    startWorkspace() {},
    showAuth() {},
    viewModule: { create: () => ({}) },
    resetRequestModule: {
      create: ({ authClient }) => {
        resetRequestClient = authClient;
        return { requestPasswordReset() {} };
      },
    },
  });

  assert.deepEqual(Object.keys(resetRequestClient), ["resetPasswordForEmail"]);
});
