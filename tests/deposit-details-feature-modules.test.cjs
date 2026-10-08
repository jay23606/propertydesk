const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("deposit details render rental-only ledger rows and preserve voided markers", () => {
  const context = vm.createContext({
    window: {
      PropertyDeskDepositAdjustmentWorkflow: {
        create: () => ({ attachDepositAdjustmentEvents() {} }),
      },
    },
  });
  for (const filename of [
    "deposit-details-model.js",
    "deposit-details-view.js",
    "deposit-workspace-workflow.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  let ledgerReads = 0;
  const state = {
    payments: [{ id: "payment-1", memo: "Move-in" }],
    expenses: [],
  };
  const { depositSectionHTML } =
    context.window.PropertyDeskDepositWorkspaceWorkflow.create({
      details: {
        state,
        money: (value) => `$${value.toFixed(2)}`,
        fmtDate: (value) => value,
        esc: (value) => String(value).replaceAll("<", "&lt;"),
        depositLedger: () => {
          ledgerReads += 1;
          return {
            entries: [
              {
                id: "entry-1",
                entry_type: "received",
                movement_date: "2026-10-01",
                amount: 500,
                source_payment_id: "payment-1",
              },
              {
                id: "entry-2",
                entry_type: "retained",
                movement_date: "2026-10-02",
                amount: 100,
                reason: "Repair",
              },
            ],
            active: [{ id: "entry-1" }],
            totals: {
              held: 400,
              received: 500,
              refunded: 0,
              retained: 100,
              restored: 0,
            },
          };
        },
      },
      adjustments: {
        $() {},
        state,
        todayIso() {},
        toast() {},
        fetchAll() {},
        moneyInput() {},
        repository: {},
        prepareAdjustment() {},
        validateAdjustment() {},
      },
    });

  assert.equal(depositSectionHTML({ id: "note-1", account_type: "note" }), "");
  assert.equal(ledgerReads, 0);
  const html = depositSectionHTML({
    id: "rental-1",
    account_type: "rental",
  });
  assert.equal(ledgerReads, 1);
  assert.match(html, /Security deposit ledger/);
  assert.match(html, /\$400\.00/);
  assert.match(html, /Move-in/);
  assert.match(html, /transaction-voided/);
  assert.match(html, /Source transaction voided/);
  assert.match(html, /data-deposit-adjustment="retained"/);
});

test("deposit detail event router refreshes the ledger after a recorded adjustment", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-detail-events.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  let held = 100;
  let clickHandler;
  const elements = new Map([
    [
      "detail-content",
      {
        addEventListener: (_name, handler) => {
          clickHandler = handler;
        },
      },
    ],
    ["detail-deposit-section", { innerHTML: "" }],
  ]);
  const feature = context.window.PropertyDeskDepositDetailEvents.create({
    $: (id) => elements.get(id),
    state: { accounts: [{ id: "rental-1", account_type: "rental" }] },
    depositSectionHTML: () => `<p>Held balance: $${held.toFixed(2)}</p>`,
    recordDepositAdjustment: async (...args) => {
      calls.push(args);
      held += 50;
      return true;
    },
  });
  feature.attachDepositAdjustmentEvents();
  await clickHandler({
    target: {
      closest: (selector) =>
        selector === "[data-deposit-adjustment]"
          ? {
              dataset: { accountId: "rental-1", depositAdjustment: "retained" },
            }
          : null,
    },
  });
  assert.deepEqual(calls, [["rental-1", "retained"]]);
  assert.match(elements.get("detail-deposit-section").innerHTML, /\$150\.00/);
});
