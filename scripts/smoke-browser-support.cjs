async function reloadThroughServiceWorker(page) {
  await page.evaluate(() => {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "This browser does not support the PropertyDesk app shell.",
      );
    }
  });
  await page.waitForFunction(
    async () =>
      Boolean((await navigator.serviceWorker.getRegistration())?.active),
    null,
    { timeout: 15000 },
  );
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker.controller),
    null,
    {
      timeout: 30000,
    },
  );
}

function assertNoBrowserErrors(pageErrors, consoleErrors, label) {
  if (pageErrors.length || consoleErrors.length) {
    throw new Error(
      `${label} browser errors: ${[...pageErrors, ...consoleErrors].join(" | ")}`,
    );
  }
}

async function assertNoUnhandledRejections(page, label) {
  await page.waitForTimeout(100);
  const rejections = await page.evaluate(
    () => window.__propertyDeskUnhandledRejections || [],
  );
  if (rejections.length) {
    throw new Error(
      `${label} unhandled promise rejections: ${rejections.join(" | ")}`,
    );
  }
}

function captureUnhandledRejections(page) {
  return page.addInitScript(() => {
    window.__propertyDeskUnhandledRejections = [];
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      window.__propertyDeskUnhandledRejections.push(
        reason instanceof Error ? reason.message : String(reason),
      );
    });
  });
}

module.exports = {
  reloadThroughServiceWorker,
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
};
