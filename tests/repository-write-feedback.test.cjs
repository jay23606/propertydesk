const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createFeedback() {
  const context = vm.createContext({ window: {} });
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
