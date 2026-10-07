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
    create(argument) {
      const getClient =
        typeof argument === "function" ? argument : argument.getClient;
      clientAccessors.push(getClient);
      return { getClient };
    },
  };
  const staticRepositories = {
    accounts: { name: "accounts" },
    accountHistory: { name: "account history" },
    deposits: { name: "deposits" },
    properties: { name: "properties" },
    transactions: { name: "transactions" },
  };
  const repositories = context.window.PropertyDeskRepositoryRegistry.create({
    repositories: {
      ...staticRepositories,
      documents: makeClientRepository,
      imports: makeClientRepository,
      propertyHolders: makeClientRepository,
      workspaceMembers: makeClientRepository,
    },
    getClient: () => activeClient,
  });

  assert.equal(Object.isFrozen(repositories), true);
  for (const [name, repository] of Object.entries(staticRepositories)) {
    assert.equal(repositories[name], repository);
  }
  assert.equal(clientAccessors.length, 4);
  assert.equal(repositories.documents.getClient(), null);

  activeClient = { id: "signed-in-client" };
  for (const getClient of clientAccessors) {
    assert.equal(getClient(), activeClient);
  }
});
