const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("payment notification setup projects current workspace records for display", () => {
  const window = {};
  const source = fs.readFileSync(
    path.join(root, "features/payment-notification-setup.js"),
    "utf8",
  );
  vm.runInNewContext(source, { window });

  let user = { id: "viewer-1", private_key: "exclude" };
  let members = [
    {
      member_user_id: "member-1",
      display_name: "Member",
      email: "member@example.test",
      private_key: "exclude",
    },
  ];
  let accounts = [
    {
      id: "account-1",
      property_id: "property-1",
      private_note: "exclude",
    },
  ];
  let properties = [
    {
      id: "property-1",
      address: "10 Main St",
      city: "Altoona",
      state: "PA",
      postal_code: "16601",
      owner_private_note: "exclude",
    },
  ];
  const ui = { toast() {}, money() {}, propertyAddress() {} };
  const services = { getClient() {}, refresh() {} };
  const workflow = {
    create(options) {
      return options;
    },
  };
  const notification = window.PropertyDeskPaymentNotificationSetup.create({
    records: {
      getWorkspaceOwnerId: () => "owner-1",
      getUser: () => user,
      getWorkspaceMembers: () => members,
      getAccounts: () => accounts,
      getProperties: () => properties,
    },
    ui,
    services,
    workflow,
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(notification.getWorkspaceIdentity())),
    {
      ownerId: "owner-1",
      viewerId: "viewer-1",
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(notification.getPaymentNotificationData())),
    {
      members: [
        {
          member_user_id: "member-1",
          display_name: "Member",
          email: "member@example.test",
        },
      ],
      accounts: [{ id: "account-1", property_id: "property-1" }],
      properties: [
        {
          id: "property-1",
          address: "10 Main St",
          city: "Altoona",
          state: "PA",
          postal_code: "16601",
        },
      ],
    },
  );

  user = { id: "viewer-2" };
  members = [];
  accounts = [];
  properties = [];
  assert.equal(notification.getWorkspaceIdentity().viewerId, "viewer-2");
  assert.deepEqual(
    JSON.parse(JSON.stringify(notification.getPaymentNotificationData())),
    { members: [], accounts: [], properties: [] },
  );
  assert.doesNotMatch(source, /runtime\.state|\bstate\./);
});
