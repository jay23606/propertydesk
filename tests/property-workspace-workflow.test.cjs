const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property workspace workflow connects details, overview, and portfolio actions", () => {
  const passed = {};
  const openPropertyDetails = () => "details";
  const attachPropertyDetailsEvents = () => "details events";
  const attachPropertyDocumentEvents = () => "document events";
  const renderOverview = () => "overview";
  const attachOverviewEvents = () => "overview events";
  const renderProperties = () => "properties";
  const attachPropertyPortfolioEvents = () => "portfolio events";
  const context = vm.createContext({
    document: {},
    window: {
      PropertyDeskPropertyDetailsWorkflow: {
        create: (dependencies) => {
          passed.details = dependencies;
          return {
            openPropertyDetails,
            attachPropertyDetailEvents: attachPropertyDetailsEvents,
            attachPropertyDocumentEvents,
          };
        },
      },
      PropertyDeskOverviewWorkflow: {
        create: (dependencies) => {
          passed.overview = dependencies;
          return { renderOverview, attachOverviewEvents };
        },
      },
      PropertyDeskPropertyPortfolioWorkflow: {
        create: (dependencies) => {
          passed.portfolio = dependencies;
          return {
            renderProperties,
            attachEvents: attachPropertyPortfolioEvents,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );
  const openAccountDetails = () => "account";
  const openPayment = () => "payment";
  const openPropertyPayment = () => "property payment";
  const openExpense = () => "expense";
  const dependencies = {
    openAccountDetails,
    openPayment,
    openPropertyPayment,
    openExpense,
  };

  const workflow =
    context.window.PropertyDeskPropertyWorkspaceWorkflow.create(dependencies);

  assert.equal(passed.details.openAccountDetails, openAccountDetails);
  assert.equal(passed.details.openPayment, openPayment);
  assert.equal(passed.overview.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.overview.openPropertyPayment, openPropertyPayment);
  assert.equal(passed.portfolio.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.portfolio.openPayment, openPayment);
  assert.equal(passed.details.openExpense, openExpense);
  assert.equal(
    workflow.attachPropertyDetailsEvents,
    attachPropertyDetailsEvents,
  );
  assert.equal(
    workflow.attachPropertyDocumentEvents,
    attachPropertyDocumentEvents,
  );
  assert.equal(workflow.renderOverview, renderOverview);
  assert.equal(workflow.attachOverviewEvents, attachOverviewEvents);
  assert.equal(workflow.renderProperties, renderProperties);
  assert.equal(
    workflow.attachPropertyPortfolioEvents,
    attachPropertyPortfolioEvents,
  );
});
