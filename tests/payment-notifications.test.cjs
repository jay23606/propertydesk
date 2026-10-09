const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function setup() {
  const messages = [];
  const calls = [];
  let refreshCount = 0;
  let handler;
  const channel = {
    on(type, filter, callback) {
      calls.push(["on", type, filter]);
      handler = callback;
      return this;
    },
    subscribe() {
      calls.push(["subscribe"]);
      return this;
    },
  };
  const client = {
    channel(name) {
      calls.push(["channel", name]);
      return channel;
    },
    removeChannel(received) {
      calls.push(["remove", received]);
    },
  };
  const state = {
    workspaceOwnerId: "owner-1",
    user: { id: "owner-1" },
    workspaceMembers: [
      {
        member_user_id: "member-1",
        display_name: "Nicole Abdal",
        email: "nicole@example.com",
      },
    ],
    accounts: [{ id: "account-1", property_id: "property-1" }],
    properties: [
      {
        id: "property-1",
        address: "12 Main St",
        city: "Altoona",
        state: "PA",
        postal_code: "16601",
      },
    ],
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "payment-notifications.js"),
      "utf8",
    ),
    context,
  );
  const feature = context.window.PropertyDeskPaymentNotifications.create({
    getWorkspaceIdentity: () => ({
      ownerId: state.workspaceOwnerId,
      viewerId: state.user?.id,
    }),
    getPaymentNotificationData: () => ({
      members: state.workspaceMembers.map(
        ({ member_user_id, display_name, email }) => ({
          member_user_id,
          display_name,
          email,
        }),
      ),
      accounts: state.accounts.map(({ id, property_id }) => ({
        id,
        property_id,
      })),
      properties: state.properties.map(
        ({ id, address, city, state, postal_code }) => ({
          id,
          address,
          city,
          state,
          postal_code,
        }),
      ),
    }),
    getRealtimeClient: () => client,
    toast: (message) => messages.push(message),
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    propertyAddress: (property) => property.address,
    refresh: async () => {
      refreshCount += 1;
    },
  });
  return {
    calls,
    channel,
    feature,
    messages,
    get handler() {
      return handler;
    },
    get refreshCount() {
      return refreshCount;
    },
    state,
  };
}

test("payment notifications subscribe to the active workspace and refresh on another member payment", async () => {
  const fixture = setup();
  assert.equal(fixture.feature.start(), true);
  assert.equal(fixture.calls[0][1], "pd-payment-notifications:owner-1:owner-1");
  assert.equal(fixture.calls[1][0], "on");
  assert.equal(fixture.calls[1][1], "postgres_changes");
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[1][2])), {
    event: "INSERT",
    schema: "public",
    table: "pd_payments",
    filter: "user_id=eq.owner-1",
  });
  assert.equal(fixture.calls[2][0], "subscribe");

  fixture.handler({
    new: {
      id: "payment-1",
      account_id: "account-1",
      amount: 550,
      recorded_by: "member-1",
      status: "posted",
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(fixture.messages, [
    "Nicole Abdal recorded a payment of $550.00 for 12 Main St.",
  ]);
  assert.equal(fixture.refreshCount, 1);
});

test("payment notifications ignore own, voided, duplicate, and unattributed rows", async () => {
  const fixture = setup();
  fixture.feature.start();
  const event = (id, recordedBy, status = "posted") =>
    fixture.handler({
      new: {
        id,
        account_id: "account-1",
        amount: 550,
        recorded_by: recordedBy,
        status,
      },
    });

  event("own", "owner-1");
  event("voided", "member-1", "voided");
  event("unattributed", null);
  event("other", "member-1");
  event("other", "member-1");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.messages.length, 1);
  assert.equal(fixture.refreshCount, 1);
});

test("payment notifications stop the prior channel when workspace identity changes", () => {
  const fixture = setup();
  fixture.feature.start();
  fixture.state.workspaceOwnerId = "owner-2";
  fixture.feature.start();
  assert.equal(fixture.calls.filter((call) => call[0] === "remove").length, 1);
  fixture.feature.stop();
  assert.equal(fixture.calls.filter((call) => call[0] === "remove").length, 2);
});

test("payment recorder attribution is server-set and payment inserts are in Realtime", () => {
  const root = path.join(__dirname, "..");
  const migration = fs.readFileSync(
    path.join(
      root,
      "supabase",
      "migrations",
      "20261008220000_payment_recorded_by_realtime.sql",
    ),
    "utf8",
  );

  assert.match(migration, /recorded_by uuid references auth\.users\(id\)/);
  assert.match(migration, /alter column recorded_by set default auth\.uid\(\)/);
  assert.match(migration, /new\.recorded_by := auth\.uid\(\)/);
  assert.match(migration, /before insert on public\.pd_payments/i);
  assert.match(
    migration,
    /alter publication supabase_realtime add table public\.pd_payments/i,
  );
});
