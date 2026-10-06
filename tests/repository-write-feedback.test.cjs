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
