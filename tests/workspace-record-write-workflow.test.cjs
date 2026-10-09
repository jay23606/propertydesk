const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadRecordWriteModules() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return Object.freeze({
    reconciliation: context.window.PropertyDeskWorkspaceWriteReconciliation,
    recordWrites: context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
  });
}

function createRecordWriter() {
  const { reconciliation, recordWrites } = loadRecordWriteModules();
  const run = async ({ operation, onUnconfirmed }) => {
    try {
      return await operation();
    } catch (error) {
      return onUnconfirmed(error);
    }
  };
  const refreshWorkspace = async ({ fetchAll, afterRefresh }) => {
    await fetchAll();
    afterRefresh?.();
    return true;
  };
  const core = reconciliation.create({
    run,
    refreshWorkspace,
  });
  return recordWrites.create({
    run,
    reconcileWorkspaceChange: core.reconcileWorkspaceChange,
    finishWorkspaceWrite: core.finishWorkspaceWrite,
  });
}

test("record-write workflow confirms a saved record after readback", async () => {
  const events = [];
  const recordWriter = createRecordWriter();
  const state = {
    accounts: [{ id: "account-1", status: "active" }],
  };

  assert.equal(
    await recordWriter.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      getCollection: (name) => state[name],
      collection: "accounts",
      payload: { status: "closed" },
      recordId: "account-1",
      fetchAll: async () => {
        state.accounts[0].status = "closed";
        events.push("refresh");
      },
      toast: (message) => events.push(["toast", message]),
      failureMessage: "Write result couldn't be confirmed.",
      refreshFailureMessage: "Refresh failed.",
      retryMessage: "Check the account before retrying.",
      onRefreshed: ({ recordWasSaved }) =>
        events.push(["readback", recordWasSaved]),
      onReconciled: () => events.push("confirmed action"),
    }),
    true,
  );
  assert.deepEqual(events, [
    "write",
    "refresh",
    ["readback", true],
    "confirmed action",
  ]);
});

test("record-write workflow confirms a new matching record by count", async () => {
  const events = [];
  const recordWriter = createRecordWriter();
  const payload = { account_name: "Rental", payment_amount: 500 };
  const state = {
    accounts: [{ id: "existing", ...payload }],
  };

  assert.equal(
    await recordWriter.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      getCollection: (name) => state[name],
      collection: "accounts",
      payload,
      fetchAll: async () => {
        state.accounts.push({ id: "saved", ...payload });
        events.push("refresh");
      },
      toast: (message) => events.push(["toast", message]),
      failureMessage: "Write result couldn't be confirmed.",
      refreshFailureMessage: "Refresh failed.",
      retryMessage: "Check the account before retrying.",
      onRefreshed: ({ recordWasSaved }) =>
        events.push(["readback", recordWasSaved]),
      onReconciled: () => events.push("confirmed action"),
    }),
    true,
  );
  assert.deepEqual(events, [
    "write",
    "refresh",
    ["readback", true],
    "confirmed action",
  ]);
});

test("record-write workflow does not confirm an unchanged matching count", async () => {
  const events = [];
  const recordWriter = createRecordWriter();
  const payload = { account_name: "Rental", payment_amount: 500 };
  const state = {
    accounts: [{ id: "existing", ...payload }],
  };

  assert.equal(
    await recordWriter.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      getCollection: (name) => state[name],
      collection: "accounts",
      payload,
      fetchAll: async () => events.push("refresh"),
      toast: (message) => events.push(["toast", message]),
      failureMessage: "Write result couldn't be confirmed.",
      refreshFailureMessage: "Refresh failed.",
      retryMessage: "Check the account before retrying.",
      onRefreshed: ({ recordWasSaved }) =>
        events.push(["readback", recordWasSaved]),
      onReconciled: () => events.push("confirmed action"),
    }),
    false,
  );
  assert.deepEqual(events, [
    "write",
    "refresh",
    ["readback", false],
    ["toast", "Check the account before retrying."],
  ]);
});

test("record-write completion selects only supported lifecycle options", () => {
  const { recordWrites } = loadRecordWriteModules();
  const recordWriter = recordWrites.create({
    run() {},
    reconcileWorkspaceChange() {},
    finishWorkspaceWrite() {},
  });
  assert.deepEqual(Object.keys(recordWriter).sort(), [
    "saveAndRefreshWorkspaceRecord",
    "saveWorkspaceRecord",
  ]);
  const onSaved = () => {};
  const onRefreshed = () => {};
  const afterRefresh = () => {};
  const selected = recordWrites.selectRecordWriteCompletion({
    onSaved,
    onRefreshed,
    afterRefresh,
    operation() {},
    state: {},
    payload: {},
    toast() {},
    unrecognized: true,
  });

  assert.equal(selected.onSaved, onSaved);
  assert.equal(selected.onRefreshed, onRefreshed);
  assert.equal(selected.afterRefresh, afterRefresh);
  assert.deepEqual(Object.keys(selected).sort(), [
    "afterRefresh",
    "onReconciled",
    "onRefreshed",
    "onSaved",
    "savedRefreshFailureMessage",
    "successMessage",
  ]);
  assert.equal("operation" in selected, false);
  assert.equal("state" in selected, false);
  assert.equal("payload" in selected, false);
  assert.equal("toast" in selected, false);
  assert.equal("unrecognized" in selected, false);
});
