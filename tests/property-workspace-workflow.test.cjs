const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property workspace workflow connects the overview and portfolio to property actions", () => {
  const passed = {};
  const openPropertyDetails = () => "details";
  const renderOverview = () => "overview";
  const attachOverviewEvents = () => "overview events";
  const renderProperties = () => "properties";
  const attachPropertyPortfolioEvents = () => "portfolio events";
  const context = vm.createContext({
    document: {},
    window: {
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
  const openPayment = () => "payment";
  const openPropertyPayment = () => "property payment";
  const dependencies = {
    openPropertyDetails,
    openPayment,
    openPropertyPayment,
  };

  const workflow =
    context.window.PropertyDeskPropertyWorkspaceWorkflow.create(dependencies);

  assert.equal(passed.overview.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.overview.openPropertyPayment, openPropertyPayment);
  assert.equal(passed.portfolio.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.portfolio.openPayment, openPayment);
  assert.equal(workflow.renderOverview, renderOverview);
  assert.equal(workflow.attachOverviewEvents, attachOverviewEvents);
  assert.equal(workflow.renderProperties, renderProperties);
  assert.equal(
    workflow.attachPropertyPortfolioEvents,
    attachPropertyPortfolioEvents,
  );
});
