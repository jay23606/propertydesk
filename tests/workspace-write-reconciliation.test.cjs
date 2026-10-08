const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createReconciliation() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
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
  const core = context.window.PropertyDeskWorkspaceWriteReconciliation.create({
    run,
    refreshWorkspace,
  });
  const records =
    context.window.PropertyDeskWorkspaceRecordWriteWorkflow.create({
      run,
      reconcileWorkspaceChange: core.reconcileWorkspaceChange,
      finishWorkspaceWrite: core.finishWorkspaceWrite,
    });
  return Object.freeze({ ...core, ...records });
}

test("workspace write reconciliation confirms a saved record after readback", async () => {
  const events = [];
  const reconciliation = createReconciliation();
  const state = {
    accounts: [{ id: "account-1", status: "active" }],
  };

  assert.equal(
    await reconciliation.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      state,
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

test("workspace write reconciliation confirms a new matching record by count", async () => {
  const events = [];
  const reconciliation = createReconciliation();
  const payload = { account_name: "Rental", payment_amount: 500 };
  const state = {
    accounts: [{ id: "existing", ...payload }],
  };

  assert.equal(
    await reconciliation.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      state,
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

test("workspace write reconciliation does not confirm an unchanged matching count", async () => {
  const events = [];
  const reconciliation = createReconciliation();
  const payload = { account_name: "Rental", payment_amount: 500 };
  const state = {
    accounts: [{ id: "existing", ...payload }],
  };

  assert.equal(
    await reconciliation.saveWorkspaceRecord({
      operation: async () => {
        events.push("write");
        throw new Error("connection lost");
      },
      state,
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
