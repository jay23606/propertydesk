const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
  reloadThroughServiceWorker,
} = require("./smoke-browser-support.cjs");

const { smokePropertyWorkflows } = require("./smoke-property-workflows.cjs");
const {
  smokeTransactionMaintenance,
  smokeTransactionWorkflows,
} = require("./smoke-transaction-workflows.cjs");

const {
  installSignedInWorkspaceFixture,
} = require("./smoke-signed-in-fixture.cjs");

async function smokeSignedInWorkflows(browser, url) {
  const signedInContext = await browser.newContext();
  const signedInPageErrors = [];
  const signedInConsoleErrors = [];
  const signedInPage = await signedInContext.newPage();
  signedInPage.setDefaultTimeout(15000);
  signedInPage.setDefaultNavigationTimeout(30000);
  await captureUnhandledRejections(signedInPage);
  signedInPage.on("pageerror", (error) =>
    signedInPageErrors.push(error.message),
  );
  signedInPage.on("console", (message) => {
    if (message.type() === "error") signedInConsoleErrors.push(message.text());
  });
  signedInContext.on("serviceworker", (worker) => {
    worker.on("console", (message) => {
      if (message.type() === "error") {
        signedInConsoleErrors.push(`Service worker: ${message.text()}`);
      }
    });
  });
  await installSignedInWorkspaceFixture(signedInPage);

  console.log("Smoke: loading synthetic signed-in workspace.");
  await signedInPage.goto(url, { waitUntil: "domcontentloaded" });
  await reloadThroughServiceWorker(signedInPage);
  assertNoBrowserErrors(
    signedInPageErrors,
    signedInConsoleErrors,
    "Signed-in startup",
  );
  try {
    await signedInPage
      .locator('#properties-table [data-property-open="smoke-property"]')
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
  } catch (error) {
    const body = await signedInPage.locator("body").innerText();
    throw new Error(
      `Synthetic Properties row did not appear. Page text: ${body.slice(-2500)}. ${error.message}`,
    );
  }
  await smokePropertyWorkflows(
    signedInPage,
    signedInPageErrors,
    signedInConsoleErrors,
  );
  await smokeTransactionWorkflows(signedInPage);
  await smokeTransactionMaintenance(signedInPage);
  if (signedInPageErrors.length || signedInConsoleErrors.length) {
    throw new Error(
      `Signed-in app browser errors: ${[...signedInPageErrors, ...signedInConsoleErrors].join(" | ")}`,
    );
  }
  await assertNoUnhandledRejections(signedInPage, "Signed-in workflows");
  console.log(
    "PropertyDesk rendered signed-in Overview, Properties, payment entry and correction, note amortization, rental deposits, account history, transaction voiding, account closure, Reports, Workspace settings, and reminder activity without browser errors or unhandled rejections.",
  );
}

module.exports = { smokeSignedInWorkflows };
