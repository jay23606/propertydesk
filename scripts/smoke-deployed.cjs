const { chromium } = require("playwright");
const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
  reloadThroughServiceWorker,
} = require("./smoke-browser-support.cjs");
const { smokeSignedInWorkflows } = require("./smoke-signed-in-workflows.cjs");

const {
  smokeAccountAmortization,
} = require("./smoke-account-amortization.cjs");

async function main() {
  const url = process.argv[2];
  if (!url)
    throw new Error("Pass the deployed PropertyDesk URL as an argument.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  await captureUnhandledRejections(page);
  const runtimeErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  context.on("serviceworker", (worker) => {
    worker.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(`Service worker: ${message.text()}`);
      }
    });
  });

  try {
    await page.route("**/config.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.PROPERTYDESK_CONFIG = {};",
      }),
    );
    await page.route("**/@supabase/supabase-js@2*", (route) =>
      route.fulfill({ contentType: "text/javascript", body: "" }),
    );
    console.log("Smoke: opening the sign-in screen.");
    await page.goto(url, { waitUntil: "domcontentloaded" });
    assertNoBrowserErrors(runtimeErrors, consoleErrors, "Initial startup");
    try {
      await page.locator("#auth-title").waitFor({
        state: "visible",
        timeout: 10000,
      });
    } catch (error) {
      const pageState = await page.evaluate(() => ({
        authView: document.getElementById("auth-view")?.className,
        appView: document.getElementById("app-view")?.className,
        bodyText: document.body.innerText.slice(0, 1200),
      }));
      throw new Error(
        `The sign-in screen did not appear. Browser errors: ${[...runtimeErrors, ...consoleErrors].join(" | ") || "none"}. Page state: ${JSON.stringify(pageState)}. ${error.message}`,
      );
    }
    console.log("Smoke: checking service-worker startup.");
    await reloadThroughServiceWorker(page);
    assertNoBrowserErrors(runtimeErrors, consoleErrors, "Startup");
    await assertNoUnhandledRejections(page, "Startup");

    await smokeAccountAmortization(page, runtimeErrors, consoleErrors);

    console.log("Smoke: checking signed-in workflows.");
    await smokeSignedInWorkflows(browser, url);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
