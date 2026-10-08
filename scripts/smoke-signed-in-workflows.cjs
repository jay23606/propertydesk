const assert = require("node:assert/strict");
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
  await signedInPage.setViewportSize({ width: 390, height: 844 });
  const mobileGrid = await signedInPage.evaluate(() => {
    const table = document.querySelector(".portfolio-table");
    const row = document.querySelector("#properties-table tr");
    const cells = row ? [...row.cells] : [];
    return {
      wrapperWidth: table?.clientWidth ?? 0,
      paymentWidth: cells[0]?.getBoundingClientRect().width ?? 0,
      addressWidth: cells[2]?.getBoundingClientRect().width ?? 0,
      emailWidth: cells[3]?.getBoundingClientRect().width ?? 0,
      smsWidth: cells[4]?.getBoundingClientRect().width ?? 0,
      firstFiveRight: cells[5]?.getBoundingClientRect().right ?? 0,
      wrapperRight: table?.getBoundingClientRect().right ?? 0,
      hiddenDue: cells[1]
        ? getComputedStyle(cells[1]).display === "none"
        : false,
      nameWidth: cells[5]?.getBoundingClientRect().width ?? 0,
    };
  });
  assert.equal(
    mobileGrid.hiddenDue,
    true,
    "mobile combines the separate due column with the payment action",
  );
  assert.ok(
    mobileGrid.paymentWidth <= 56,
    `mobile payment column should be at most 56px; got ${mobileGrid.paymentWidth}px`,
  );
  assert.ok(
    mobileGrid.addressWidth <= 90,
    `mobile address column should be at most 90px; got ${mobileGrid.addressWidth}px`,
  );
  assert.ok(
    mobileGrid.emailWidth <= 40 && mobileGrid.smsWidth <= 40,
    `mobile Email and SMS columns should each be at most 40px: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.nameWidth <= 80,
    `mobile tenant/buyer name column should be at most 80px; got ${mobileGrid.nameWidth}px`,
  );
  assert.ok(
    mobileGrid.firstFiveRight <= mobileGrid.wrapperRight,
    `the payment/due, address, Email, SMS, and name columns should fit at 390px: ${JSON.stringify(mobileGrid)}`,
  );
  await signedInPage.setViewportSize({ width: 1280, height: 720 });
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
