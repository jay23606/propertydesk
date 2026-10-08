const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModel() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "email-address-utils.js"),
      "utf8",
    ),
    context,
  );
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
  const result = loadModel().partyEmails(
    "buyer@example.test, not-an-email",
    false,
  );

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

test("account form model builds named payload values from form fields", () => {
  const form = {
    type: "land_contract",
    propertyId: "property-1",
    name: "Land contract",
    partyName: "Buyer",
    partyPhone: "555-0100",
    reminderEnabled: false,
    startDate: "2026-01-01",
    nextDueDate: "2026-02-01",
    paymentAmount: "750",
    paymentFrequency: "monthly",
    originalPrincipal: "90000",
    principalInterestAmount: "600",
    escrowAmount: "150",
    balanceAdjustment: "0",
    interestRate: "5.5",
    termMonths: "360",
    balloonDate: "",
    agreementEffectiveDate: "",
    agreementChangeReason: "",
    lateFee: "0",
    graceDays: "0",
    notes: "",
  };
  const result = loadModel().payloadValuesFromForm(form, "workspace-1", [
    "buyer@example.test",
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ownerId: "workspace-1",
    propertyId: "property-1",
    accountType: "land_contract",
    name: "Land contract",
    partyName: "Buyer",
    partyEmails: ["buyer@example.test"],
    partyPhone: "555-0100",
    reminderEnabled: false,
    startDate: "2026-01-01",
    nextDueDate: "2026-02-01",
    paymentAmount: "750",
    paymentFrequency: "monthly",
    originalPrincipal: "90000",
    principalInterestAmount: "600",
    escrowAmount: "150",
    balanceAdjustment: "0",
    interestRate: "5.5",
    termMonths: "360",
    balloonDate: "",
    agreementEffectiveDate: "",
    agreementChangeReason: "",
    lateFee: "0",
    graceDays: "0",
    notes: "",
  });
});
