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
      wrapperLeft: table?.getBoundingClientRect().left ?? 0,
      wrapperRight: table?.getBoundingClientRect().right ?? 0,
      viewportWidth: window.innerWidth,
      paymentWidth: cells[0]?.getBoundingClientRect().width ?? 0,
      addressWidth: cells[2]?.getBoundingClientRect().width ?? 0,
      emailWidth: cells[3]?.getBoundingClientRect().width ?? 0,
      smsWidth: cells[4]?.getBoundingClientRect().width ?? 0,
      addressPadding: cells[2] ? getComputedStyle(cells[2]).paddingLeft : null,
      emailPadding: cells[3] ? getComputedStyle(cells[3]).paddingLeft : null,
      firstFiveRight: cells[5]?.getBoundingClientRect().right ?? 0,
      hiddenDue: cells[1]
        ? getComputedStyle(cells[1]).display === "none"
        : false,
      nameWidth: cells[5]?.getBoundingClientRect().width ?? 0,
      monthlyPaymentLeft: cells[6]?.getBoundingClientRect().left ?? 0,
    };
  });
  assert.equal(
    mobileGrid.hiddenDue,
    true,
    "mobile combines the separate due column with the payment action",
  );
  assert.ok(
    mobileGrid.paymentWidth <= 50,
    `mobile due/payment column should stay compact; got ${mobileGrid.paymentWidth}px`,
  );
  assert.ok(
    mobileGrid.addressWidth >= 155,
    `mobile address column should have room for wrapped addresses: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.emailWidth <= 36 && mobileGrid.smsWidth <= 36,
    `mobile Email and SMS columns should each be at most 40px: ${JSON.stringify(mobileGrid)}`,
  );
  assert.equal(
    mobileGrid.addressPadding,
    "0px",
    `mobile address should not have left/right padding: ${JSON.stringify(mobileGrid)}`,
  );
  assert.equal(
    mobileGrid.emailPadding,
    "0px",
    `mobile reminder action columns should not have left/right padding: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.nameWidth >= 130,
    `mobile tenant/buyer name column should have room for wrapped names: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.wrapperLeft <= 1 &&
      Math.abs(mobileGrid.wrapperRight - mobileGrid.viewportWidth) <= 1,
    `the mobile Properties grid should reach both screen edges: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.monthlyPaymentLeft >= mobileGrid.wrapperRight - 1,
    `the sixth Monthly Payment column should start beyond the phone viewport: ${JSON.stringify(mobileGrid)}`,
  );
  assert.ok(
    mobileGrid.firstFiveRight <= mobileGrid.wrapperRight + 1,
    `the payment/due, address, Email, SMS, and name columns should fit at 390px: ${JSON.stringify(mobileGrid)}`,
  );
  await signedInPage.setViewportSize({ width: 430, height: 844 });
  const widerMobileGrid = await signedInPage.evaluate(() => {
    const table = document.querySelector(".portfolio-table");
    const row = document.querySelector("#properties-table tr");
    const monthlyPayment = row?.cells[6];
    return {
      wrapperRight: table?.getBoundingClientRect().right ?? 0,
      monthlyPaymentLeft: monthlyPayment?.getBoundingClientRect().left ?? 0,
    };
  });
  assert.ok(
    widerMobileGrid.monthlyPaymentLeft >= widerMobileGrid.wrapperRight - 1,
    `the sixth column should remain off-screen at 430px: ${JSON.stringify(widerMobileGrid)}`,
  );
  await signedInPage.setViewportSize({ width: 320, height: 740 });
  const narrowMobileGrid = await signedInPage.evaluate(() => {
    const table = document.querySelector(".portfolio-table");
    const row = document.querySelector("#properties-table tr");
    return {
      wrapperLeft: table?.getBoundingClientRect().left ?? 0,
      wrapperRight: table?.getBoundingClientRect().right ?? 0,
      firstFiveRight: row?.cells[5]?.getBoundingClientRect().right ?? 0,
      monthlyPaymentLeft: row?.cells[6]?.getBoundingClientRect().left ?? 0,
    };
  });
  assert.ok(
    narrowMobileGrid.wrapperLeft <= 1 &&
      narrowMobileGrid.firstFiveRight <= narrowMobileGrid.wrapperRight + 1,
    `the first five columns should fit edge-to-edge at 320px: ${JSON.stringify(narrowMobileGrid)}`,
  );
  assert.ok(
    narrowMobileGrid.monthlyPaymentLeft >= narrowMobileGrid.wrapperRight - 1,
    `the sixth column should stay off-screen at 320px: ${JSON.stringify(narrowMobileGrid)}`,
  );
  for (const width of [361, 375, 399]) {
    await signedInPage.setViewportSize({ width, height: 844 });
    const grid = await signedInPage.evaluate(() => {
      const table = document.querySelector(".portfolio-table");
      const row = document.querySelector("#properties-table tr");
      return {
        wrapperLeft: table?.getBoundingClientRect().left ?? 0,
        wrapperRight: table?.getBoundingClientRect().right ?? 0,
        firstFiveRight: row?.cells[5]?.getBoundingClientRect().right ?? 0,
        monthlyPaymentLeft: row?.cells[6]?.getBoundingClientRect().left ?? 0,
      };
    });
    assert.ok(
      grid.wrapperLeft <= 1 &&
        grid.firstFiveRight <= grid.wrapperRight + 1 &&
        grid.monthlyPaymentLeft >= grid.wrapperRight - 1,
      `the first five columns should fill the screen and keep Monthly Payment offscreen at ${width}px: ${JSON.stringify(grid)}`,
    );
  }
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
