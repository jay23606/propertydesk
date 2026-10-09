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
  const queryUtils = { insert() {} };
  const makeClientRepository = {
    create({ getClient, queryUtils: receivedQueryUtils }) {
      clientAccessors.push({ getClient, queryUtils: receivedQueryUtils });
      return { getClient };
    },
  };
  const repositories = context.window.PropertyDeskRepositoryRegistry.create({
    repositories: {
      queryUtils,
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
    queryUtils,
    getClient: () => activeClient,
  });

  assert.equal(Object.isFrozen(repositories), true);
  assert.equal(clientAccessors.length, 9);
  assert.equal(repositories.documents.getClient(), null);

  activeClient = { id: "signed-in-client" };
  for (const { getClient, queryUtils: receivedQueryUtils } of clientAccessors) {
    assert.equal(getClient(), activeClient);
    assert.equal(receivedQueryUtils, queryUtils);
  }
});
