const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createFeedback() {
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
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskRepositoryWriteFeedback;
}

test("repository write feedback returns success without notifying", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => ({ error: null }),
      toast: (message) => messages.push(message),
      failureMessage: "Unavailable",
    }),
    true,
  );
  assert.deepEqual(messages, []);
});

test("repository write feedback exposes only its supported API", () => {
  const feedback = createFeedback();

  assert.deepEqual(Object.keys(feedback).sort(), [
    "reconcileWorkspaceChange",
    "refreshWorkspace",
    "run",
    "runAndRefreshWorkspaceChange",
    "saveAndRefreshWorkspaceRecord",
    "saveWorkspaceRecord",
    "selectRecordWriteCompletion",
  ]);
  assert.equal(Object.isFrozen(feedback), true);
});

test("record-write completion selects only supported lifecycle options", () => {
  const feedback = createFeedback();
  const onSaved = () => {};
  const onRefreshed = () => {};
  const afterRefresh = () => {};
  const selected = feedback.selectRecordWriteCompletion({
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
  assert.deepEqual(
    Object.keys(feedback.selectRecordWriteCompletion()).sort(),
    Object.keys(selected).sort(),
  );
});

test("repository write feedback shows returned database errors", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => ({
        error: { message: "Database rejected write" },
      }),
      toast: (message) => messages.push(message),
      failureMessage: "Unavailable",
    }),
    false,
  );
  assert.deepEqual(messages, ["Database rejected write"]);
});

test("repository write feedback supports domain-specific database messages", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => ({ error: { message: "Permission denied" } }),
      toast: (message) => messages.push(message),
      failureMessage: "Unavailable",
      errorMessage: (error) => `Deposit adjustment failed: ${error.message}`,
    }),
    false,
  );
  assert.deepEqual(messages, ["Deposit adjustment failed: Permission denied"]);
});

test("repository write feedback can reject a successful response by domain rule", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => ({ data: null, error: null }),
      toast: (message) => messages.push(message),
      failureMessage: "Unavailable",
      resultFailureMessage: ({ data }) =>
        data ? null : "The record was already changed.",
    }),
    false,
  );
  assert.deepEqual(messages, ["The record was already changed."]);
});

test("repository write feedback reports rejected requests with domain fallback", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => {
        throw new Error("offline");
      },
      toast: (message) => messages.push(message),
      failureMessage: "Property couldn't be saved right now.",
    }),
    false,
  );
  assert.deepEqual(messages, ["Property couldn't be saved right now."]);
});

test("repository write feedback reconciles an unconfirmed write without misreporting success", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => {
        throw new Error("connection lost");
      },
      toast: (message) => events.push(["toast", message]),
      failureMessage: "Write result couldn't be confirmed.",
      onUnconfirmed: async (error) => {
        events.push(["reconcile", error.message]);
      },
    }),
    false,
  );
  assert.deepEqual(events, [["reconcile", "connection lost"]]);
});

test("repository write feedback accepts a write confirmed by readback", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => {
        throw new Error("connection lost");
      },
      toast: (message) => messages.push(message),
      failureMessage: "Write result couldn't be confirmed.",
      onUnconfirmed: async () => true,
    }),
    true,
  );
  assert.deepEqual(messages, []);
});

test("repository write feedback uses its fallback when unconfirmed reconciliation fails", async () => {
  const messages = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.run({
      operation: async () => {
        throw new Error("connection lost");
      },
      toast: (message) => messages.push(message),
      failureMessage: "Write result couldn't be confirmed.",
      onUnconfirmed: async () => {
        throw new Error("refresh failed");
      },
    }),
    false,
  );
  assert.deepEqual(messages, ["Write result couldn't be confirmed."]);
});

test("post-write refresh shows success only after workspace data reloads", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      fetchAll: async () => events.push("refresh"),
      toast: (message) => events.push(["toast", message]),
      successMessage: "Payment corrected",
    }),
    true,
  );
  assert.deepEqual(events, ["refresh", ["toast", "Payment corrected"]]);
});

test("post-write refresh runs domain callbacks between reload and success feedback", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      fetchAll: async () => events.push("refresh"),
      afterRefresh: () => events.push("restore-details"),
      toast: (message) => events.push(["toast", message]),
      successMessage: "Property archived",
    }),
    true,
  );
  assert.deepEqual(events, [
    "refresh",
    "restore-details",
    ["toast", "Property archived"],
  ]);
});

test("post-write refresh can show success before reload and reopen after it", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      beforeRefresh: () =>
        events.push(["toast", "Agreement uploaded privately"]),
      fetchAll: async () => events.push("refresh"),
      afterRefresh: () => events.push("reopen-property"),
    }),
    true,
  );
  assert.deepEqual(events, [
    ["toast", "Agreement uploaded privately"],
    "refresh",
    "reopen-property",
  ]);
});

test("post-write refresh keeps early success feedback when reload fails", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      beforeRefresh: () => events.push(["toast", "Agreement deleted"]),
      fetchAll: async () => {
        events.push("refresh");
        throw new Error("offline");
      },
      afterRefresh: () => events.push("reopen-property"),
    }),
    false,
  );
  assert.deepEqual(events, [["toast", "Agreement deleted"], "refresh"]);
});

test("post-write refresh suppresses success feedback when reload fails", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      fetchAll: async () => {
        events.push("refresh");
        throw new Error("offline");
      },
      toast: (message) => events.push(["toast", message]),
      successMessage: "Payment corrected",
    }),
    false,
  );
  assert.deepEqual(events, ["refresh"]);
});

test("post-write refresh reports a saved change when reload fails", async () => {
  const events = [];
  const feedback = createFeedback();

  assert.equal(
    await feedback.refreshWorkspace({
      fetchAll: async () => {
        events.push("refresh");
        throw new Error("offline");
      },
      toast: (message) => events.push(["toast", message]),
      successMessage: "Payment corrected",
      refreshFailureMessage:
        "Payment correction was saved, but the workspace could not refresh.",
    }),
    false,
  );
  assert.deepEqual(events, [
    "refresh",
    [
      "toast",
      "Payment correction was saved, but the workspace could not refresh.",
    ],
  ]);
});
