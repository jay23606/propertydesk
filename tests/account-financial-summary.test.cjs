const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("shared account financial summary keeps due and loan rules consistent", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-financial-summary.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const model = context.window.PropertyDeskAccountFinancialSummary.create({
    accountBalance: (account) => {
      calls.push(["balance", account.id]);
      return 12000;
    },
    amountDueSince: (...args) => {
      calls.push(["due", ...args]);
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-06",
  });
  const payments = [{ id: "payment-1" }];
  const note = { id: "note-1", account_type: "note" };
  const rental = { id: "rental-1", account_type: "rental" };

  assert.deepEqual(
    JSON.parse(JSON.stringify(model.summarizeAccount(note, payments))),
    {
      unpaidDue: 550,
      unpaidStart: "2026-10-01",
      unpaidAsOf: "2026-10-06",
      loanBalance: 12000,
      hasLoanBalance: true,
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(model.summarizeAccount(rental, payments))),
    {
      unpaidDue: 550,
      unpaidStart: "2026-10-01",
      unpaidAsOf: "2026-10-06",
      loanBalance: 0,
      hasLoanBalance: false,
    },
  );
  assert.deepEqual(
    calls.filter(([kind]) => kind === "balance"),
    [["balance", "note-1"]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls.filter(([kind]) => kind === "due"))),
    [
      ["due", [note], payments, "2026-10-01", "2026-10-06"],
      ["due", [rental], payments, "2026-10-01", "2026-10-06"],
    ],
  );
});
