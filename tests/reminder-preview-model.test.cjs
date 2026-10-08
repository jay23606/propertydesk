const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
require("../features/email-address-utils.js");
require("../supabase/functions/_shared/reminder-copy.js");
const { paymentReminderMessage } = require("../features/email-utils.js");

test("reminder preview model derives the due and email content from current terms", () => {
  const messageCalls = [];
  const context = vm.createContext({
    window: {
      PropertyDeskEmailUtils: {
        paymentReminderMessage: (options) => {
          messageCalls.push(options);
          return paymentReminderMessage(options);
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview-model.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const model = context.window.PropertyDeskReminderPreviewModel.create({
    paymentReminderMessage:
      context.window.PropertyDeskEmailUtils.paymentReminderMessage,
    amountDueSince: (...args) => {
      calls.push(args);
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    monthEnd: () => "2026-10-31",
    dateOnly: () => ({ toLocaleDateString: () => "October 2026" }),
    monthStart: () => "2026-10-01",
    propertyAddress: (property) => property.address,
    money: (amount) => `USD ${amount.toFixed(2)}`,
  });
  const property = { id: "property-1", address: "10 Main St" };
  const account = {
    id: "account-1",
    party_name: "Buyer",
    payment_amount: 550,
  };
  const payments = [{ id: "payment-1" }];

  const preview = model.build({
    property,
    account,
    recipients: ["buyer@example.test"],
    payments,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), [
    [account],
    payments,
    "2026-10-01",
    "2026-10-31",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(messageCalls[0])), {
    address: "10 Main St",
    subjectAddress: "10 Main St",
    unpaidDue: "USD 550.00",
    recipientName: "Buyer",
    senderName: "PropertyDesk",
    month: "October 2026",
    asOf: "2026-10-31",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(preview)), {
    recipients: ["buyer@example.test"],
    subject: "Payment reminder for 10 Main St · October 2026",
    label: "October 2026",
    schedule:
      "Last day of October 2026, only when no rent or installment payment is recorded that month",
    body: "Hello Buyer, our records show USD 550.00 unpaid for October 2026 at 10 Main St. Please arrange payment promptly, or contact me if you believe our records are incorrect.",
  });
});
