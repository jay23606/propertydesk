const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property portfolio indexes accounts and holders once per grid build", () => {
  const iterations = { properties: 0, accounts: 0, holders: 0 };
  const track = (name, rows) => ({
    [Symbol.iterator]: function* () {
      iterations[name]++;
      yield* rows;
    },
  });
  const properties = [
    { id: "property-1", name: "Oak", address: "1 Oak St" },
    { id: "property-2", name: "Vacant", address: "2 Oak St" },
    { id: "property-3", name: "Inactive", address: "3 Oak St" },
    {
      id: "property-4",
      name: "Archived",
      address: "4 Oak St",
      archived_at: "2026-01-01",
    },
  ];
  const accounts = [
    {
      id: "account-1",
      property_id: "property-1",
      status: "active",
      account_type: "land_contract",
      party_name: "Buyer One",
      name: "Contract",
    },
    {
      id: "account-2",
      property_id: "property-3",
      status: "inactive",
      account_type: "rental",
      party_name: "Former Tenant",
      name: "Rental",
    },
  ];
  const state = {
    properties: track("properties", properties),
    accounts: track("accounts", accounts),
    propertyHolders: track("holders", [
      { property_id: "property-1", member_user_id: "member-1" },
      { property_id: "property-2", member_user_id: "member-2" },
    ]),
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-account-index.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-portfolio-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-filter-model.js",
      ),
      "utf8",
    ),
    context,
  );
  const filterModel =
    context.window.PropertyDeskPropertyPortfolioFilterModel.create({
      state,
      propertyAddress: (property) => property.address,
    });
  const model = context.window.PropertyDeskPropertyPortfolioModel.create({
    state,
    accountRowModel: {
      buildAccountRow: (property, account, street) => ({
        hasAccount: true,
        party: account.party_name,
        account: account.name,
        address: street,
        id: account.id,
        property,
      }),
    },
    streetAddress: (property) => property.name,
    filterModel,
  });

  const rows = model.buildRows({
    query: "",
    type: "all",
    holderId: "all",
    showArchived: false,
  });
  assert.deepEqual(
    Array.from(rows, (row) => row.id),
    ["account-1", "property-2"],
  );
  assert.deepEqual(iterations, { properties: 1, accounts: 1, holders: 1 });

  const assignedRows = model.buildRows({
    query: "buyer",
    type: "all",
    holderId: "member-1",
    showArchived: false,
  });
  assert.deepEqual(
    Array.from(assignedRows, (row) => row.id),
    ["account-1"],
  );
  assert.deepEqual(iterations, { properties: 2, accounts: 2, holders: 2 });
});

test("property portfolio actions workflow owns quick-note and grid action routing", () => {
  const passed = {};
  const action = () => {};
  let attached = 0;
  const state = {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyQuickNote: {
        create: (options) => {
          passed.quickNoteOptions = options;
          return { editPropertyQuickNote: action };
        },
      },
      PropertyDeskPropertyViewEvents: {
        create: (options) => {
          passed.actionOptions = options;
          return { attachEvents: () => attached++ };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "property-portfolio-actions-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const workflow =
    context.window.PropertyDeskPropertyPortfolioActionsWorkflow.create({
      $: action,
      state,
      toast: action,
      fetchAll: action,
      streetAddress: action,
      openPayment: action,
      openPropertyDetails: action,
      openAccountForProperty: action,
    });

  assert.equal(passed.quickNoteOptions.state, state);
  assert.equal(passed.quickNoteOptions.toast, action);
  assert.equal(passed.quickNoteOptions.fetchAll, action);
  assert.equal(passed.quickNoteOptions.streetAddress, action);
  assert.equal(passed.actionOptions.openPayment, action);
  assert.equal(passed.actionOptions.editPropertyQuickNote, action);
  assert.equal(passed.actionOptions.openAccountForProperty, action);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});
