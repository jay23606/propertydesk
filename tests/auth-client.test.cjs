const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadAuthClient() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "auth-client.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskAuthClient;
}

test("auth client resolves the current backend lazily and forwards auth calls", async () => {
  const calls = [];
  let client = null;
  const factory = loadAuthClient();
  const adapter = factory.create({ getClient: () => client });
  const expected = { data: { user: { id: "owner" } }, error: null };
  const methods = [
    "onAuthStateChange",
    "signUp",
    "signInWithPassword",
    "getSession",
    "signOut",
    "resetPasswordForEmail",
    "updateUser",
  ];
  const auth = Object.fromEntries(
    methods.map((method) => [
      method,
      async (...args) => {
        calls.push([method, ...args]);
        return expected;
      },
    ]),
  );

  assert.deepEqual(Object.keys(adapter).sort(), methods.sort());
  assert.throws(() => adapter.getSession(), /not ready yet/i);
  client = { auth };

  for (const method of methods) {
    const args = [{ method }];
    assert.equal(await adapter[method](...args), expected);
    assert.deepEqual(calls.at(-1), [method, ...args]);
  }

  const replacementAuth = {
    getSession: async () => "replacement-client",
  };
  client = { auth: replacementAuth };
  assert.equal(await adapter.getSession(), "replacement-client");
});
