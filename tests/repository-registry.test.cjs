const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("registry creates frozen adapters that resolve the active client lazily", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "repository-registry.js"),
    "utf8",
  );
  const context = { window: {} };
  vm.runInNewContext(source, context);

  let activeClient = null;
  const clientAccessors = [];
  const makeClientRepository = {
    create({ getClient }) {
      clientAccessors.push(getClient);
      return { getClient };
    },
  };
  const repositories = context.window.PropertyDeskRepositoryRegistry.create({
    repositories: {
      accounts: makeClientRepository,
      accountHistory: makeClientRepository,
      deposits: makeClientRepository,
      documents: makeClientRepository,
      imports: makeClientRepository,
      properties: makeClientRepository,
      propertyHolders: makeClientRepository,
      transactions: makeClientRepository,
      workspaceMembers: makeClientRepository,
    },
    getClient: () => activeClient,
  });

  assert.equal(Object.isFrozen(repositories), true);
  assert.equal(clientAccessors.length, 9);
  assert.equal(repositories.documents.getClient(), null);

  activeClient = { id: "signed-in-client" };
  for (const getClient of clientAccessors) {
    assert.equal(getClient(), activeClient);
  }
});
