const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("reminder preview setup exposes only the property and payment fields it needs", () => {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(
      path.join(root, "features/reminder-preview-setup.js"),
      "utf8",
    ),
    { window },
  );

  const properties = [
    {
      id: "property-1",
      address: "10 Main St",
      city: "Altoona",
      state: "PA",
      postal_code: "16601",
      private_detail: "excluded",
    },
  ];
  const payments = [
    {
      account_id: "account-1",
      received_date: "2026-10-01",
      amount: 550,
      status: "posted",
      income_category: "payment",
      private_detail: "excluded",
    },
    {
      account_id: "account-2",
      received_date: "2026-10-02",
      amount: 20,
      status: "posted",
      income_category: "payment",
    },
  ];
  const configured = {};
  const workflowResult = { previewReminderEmail() {} };
  const result = window.PropertyDeskReminderPreviewSetup.create({
    records: {
      getProperties: () => properties,
      getPayments: () => payments,
    },
    ui: {
      $: () => {},
      monthEnd: () => {},
      dateOnly: () => {},
      monthStart: () => {},
      propertyAddress: () => {},
      money: () => {},
      todayIso: () => {},
      moneyInput: () => {},
      toast: () => {},
      esc: () => {},
      openModal: () => {},
    },
    services: {
      paymentReminderMessage: () => {},
      amountDueSince: () => {},
      unpaidDueAccrualStart: () => {},
      splitEmailAddresses: () => {},
    },
    workflows: {
      previewWorkflow: {
        create(options) {
          Object.assign(configured, options);
          return workflowResult;
        },
      },
      model: {},
      preview: {},
    },
  });

  assert.equal(result, workflowResult);
  assert.deepEqual(
    JSON.parse(JSON.stringify(configured.getProperty("property-1"))),
    {
      id: "property-1",
      address: "10 Main St",
      city: "Altoona",
      state: "PA",
      postal_code: "16601",
    },
  );
  assert.equal(configured.getProperty("missing"), null);
  assert.deepEqual(
    JSON.parse(JSON.stringify(configured.getPaymentsForAccount("account-1"))),
    [
      {
        account_id: "account-1",
        received_date: "2026-10-01",
        amount: 550,
        status: "posted",
        income_category: "payment",
      },
    ],
  );
});
