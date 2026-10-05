const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModel() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-form-model.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskAccountFormModel;
}

test("account form model normalizes a list of party email addresses", () => {
  const result = loadModel().partyEmails(
    " buyer@example.test ; co-buyer@example.test, ",
    false,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    emails: ["buyer@example.test", "co-buyer@example.test"],
    error: "",
  });
});

test("account form model rejects malformed party addresses", () => {
  const result = loadModel().partyEmails("buyer@example.test, not-an-email", false);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    emails: ["buyer@example.test", "not-an-email"],
    error: "Check each tenant/buyer email address.",
  });
});

test("account form model requires an address when reminders are enabled", () => {
  const result = loadModel().partyEmails(" ; , ", true);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    emails: [],
    error: "Add at least one tenant/buyer email before enabling reminders.",
  });
});
