const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const emailAddressUtils = require("../features/email-address-utils.js");
const emailUtils = require("./email-utils-helper.cjs");
test("reminder preview uses current form values and escapes recipient-facing text", () => {
  const context = vm.createContext({
    window: { PropertyDeskEmailUtils: emailUtils },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "email-address-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview.js"),
      "utf8",
    ),
    context,
  );
  const values = {
    "account-property": { value: "property-1" },
    "account-id": { value: "" },
    "account-type": { value: "land_contract" },
    "account-name": { value: "Installment" },
    "account-party": { value: "<Renter>" },
    "account-start": { value: "" },
    "account-next-due": { value: "" },
    "account-payment": { value: "550" },
    "account-frequency": { value: "monthly" },
    "account-party-email": { value: "buyer@example.test" },
    "reminder-preview-content": { innerHTML: "" },
  };
  const state = {
    properties: [{ id: "property-1", address: "10 Main <St>" }],
    payments: [],
  };
  const calls = [];
  const model = context.window.PropertyDeskReminderPreviewModel.create({
    paymentReminderMessage: emailUtils.paymentReminderMessage,
    amountDueSince: (accounts, payments, start, end) => {
      calls.push({ account: accounts[0], payments, start, end });
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    monthEnd: () => "2026-10-31",
    dateOnly: () => ({ toLocaleDateString: () => "October 2026" }),
    monthStart: () => "2026-10-01",
    propertyAddress: (property) => property.address,
    money: (value) => "USD " + Number(value).toFixed(2),
  });
  const feature = context.window.PropertyDeskReminderPreview.create({
    $: (id) => values[id],
    state,
    todayIso: () => "2026-10-04",
    moneyInput: Number,
    toast: (message) => calls.push(message),
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    openModal: (id) => calls.push(id),
    splitEmailAddresses: emailAddressUtils.splitEmailAddresses,
    model,
  });

  feature.previewReminderEmail();

  assert.equal(calls[0].account.payment_amount, 550);
  assert.equal(calls[0].start, "2026-10-01");
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /buyer@example\.test/,
  );
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;Renter&gt;/);
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;St&gt;/);
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Hi &lt;Renter&gt;,<br><br>Our records show USD 550\.00 unpaid for 10 Main &lt;St&gt; \(tracked since October 2026; earlier balances or late fees may not be included\)\.<br><br>Please arrange payment promptly or contact me with questions\.<br><br>Thanks!/,
  );
  assert.equal(calls.at(-1), "reminder-preview-modal");
});
