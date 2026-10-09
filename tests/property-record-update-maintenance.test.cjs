const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property record maintenance receives only the record save operation", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-record-update-maintenance.js",
    ),
    "utf8",
  );
  vm.runInContext(source, context);

  const state = { properties: [] };
  const payload = { notes: "Call on Friday" };
  const calls = [];
  const saveAndRefreshWorkspaceRecord = (options) => {
    calls.push(options);
  };
  const repository = {
    updateOwned(...args) {
      return args;
    },
  };
  const fetchAll = async () => {};
  const toast = () => {};
  const maintenance =
    context.window.PropertyDeskPropertyRecordUpdateMaintenance.create({
      getCollection: (collection) => state[collection],
      fetchAll,
      toast,
      repository,
      saveAndRefreshWorkspaceRecord,
    });

  await maintenance.savePropertyUpdate({
    propertyId: "property-1",
    ownerId: "workspace-1",
    payload,
    failureMessage: "Save failed",
    refreshFailureMessage: "Refresh failed",
    retryMessage: "Check before retrying",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].getCollection("properties"), state.properties);
  assert.equal("state" in calls[0], false);
  assert.equal(calls[0].collection, "properties");
  assert.equal(calls[0].payload, payload);
  assert.equal(calls[0].recordId, "property-1");
  assert.equal(calls[0].fetchAll, fetchAll);
  assert.equal(calls[0].toast, toast);
  assert.deepEqual(calls[0].operation(), [
    "property-1",
    "workspace-1",
    payload,
  ]);
  assert.doesNotMatch(source, /writeFeedback/);
});
