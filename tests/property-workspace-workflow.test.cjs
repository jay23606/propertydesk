const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property workspace shares detail actions across overview and grid", () => {
  const root = path.join(__dirname, "..");
  const calls = [];
  const openPropertyDetails = () => "details";
  const detail = { content: {}, management: {} };
  const openPropertyPayment = () => "overview-payment";
  const openPayment = () => "grid-payment";
  const state = {};
  const propertyAddress = () => "address";
  const lateReminderMailto = () => "reminder";
  const overview = {
    state,
    propertyAddress,
    openPropertyPayment,
    unusedDependency: true,
  };
  const portfolio = {
    state,
    propertyAddress,
    lateReminderMailto,
    openPayment,
    unusedDependency: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyScreenWorkflow: {
        create(options) {
          calls.push(["detail", options]);
          return {
            openPropertyDetails,
            attachPropertyDetailEvents() {},
            attachPropertyQuickActionEvents() {},
            attachPropertyHolderEvents() {},
            attachPropertyDocumentEvents() {},
          };
        },
      },
      PropertyDeskOverviewWorkflow: {
        create(options) {
          calls.push(["overview", options]);
          return { renderOverview() {}, attachOverviewEvents() {} };
        },
      },
      PropertyDeskPropertyPortfolioWorkflow: {
        create(options) {
          calls.push(["portfolio", options]);
          return {
            renderProperties() {},
            attachPropertyGridEvents() {},
            attachPropertyActionEvents() {},
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "property-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workspace = context.window.PropertyDeskPropertyWorkspaceWorkflow.create(
    { detail, overview, portfolio },
  );

  assert.deepEqual(
    calls.map(([name]) => name),
    ["detail", "overview", "portfolio"],
  );
  assert.equal(calls[0][1], detail);
  assert.equal(calls[1][1].state, state);
  assert.equal(calls[1][1].propertyAddress, propertyAddress);
  assert.equal(calls[1][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[1][1].openPropertyPayment, openPropertyPayment);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[2][1].state, state);
  assert.equal(calls[2][1].propertyAddress, propertyAddress);
  assert.equal(calls[2][1].lateReminderMailto, lateReminderMailto);
  assert.equal(calls[2][1].openPropertyDetails, openPropertyDetails);
  assert.equal(calls[2][1].openPayment, openPayment);
  assert.equal("unusedDependency" in calls[2][1], false);
  assert.equal(workspace.openPropertyDetails, openPropertyDetails);
  assert.deepEqual(Object.keys(workspace).sort(), [
    "attachOverviewEvents",
    "attachPropertyActionEvents",
    "attachPropertyDetailEvents",
    "attachPropertyDocumentEvents",
    "attachPropertyGridEvents",
    "attachPropertyHolderEvents",
    "attachPropertyQuickActionEvents",
    "openPropertyDetails",
    "renderOverview",
    "renderProperties",
  ]);
});
