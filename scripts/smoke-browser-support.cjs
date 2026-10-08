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

async function assertVersionedAppScriptAvailableOffline(page, context) {
  const scriptURL = await page.evaluate(() => {
    const script = Array.from(document.scripts).find(
      (item) => item.src && new URL(item.src).pathname.endsWith("/app.js"),
    );
    if (!script) throw new Error("The app script is missing from the page.");
    const url = new URL(script.src);
    url.searchParams.set("offline-smoke", "versioned-shell");
    return url.href;
  });
  await context.setOffline(true);
  try {
    const response = await page.evaluate(async (assetURL) => {
      const asset = await fetch(assetURL, { cache: "reload" });
      return { ok: asset.ok, status: asset.status, body: await asset.text() };
    }, scriptURL);
    if (!response.ok || !response.body.includes("PropertyDesk")) {
      throw new Error(
        `The versioned app script was unavailable offline (HTTP ${response.status}).`,
      );
    }
  } finally {
    await context.setOffline(false);
  }
}

async function assertThemeToggleWorks(page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const initialTheme = root.dataset.theme;
    const button = document.querySelector("#auth-view [data-theme-toggle]");
    if (!button) throw new Error("The sign-in theme toggle is missing.");
    const initialColor = getComputedStyle(root).getPropertyValue("--canvas");
    try {
      button.click();
      return {
        themeChanged: root.dataset.theme !== initialTheme,
        colorChanged:
          getComputedStyle(root).getPropertyValue("--canvas") !== initialColor,
        label: button.querySelector(".theme-label")?.textContent,
      };
    } finally {
      if (root.dataset.theme !== initialTheme) button.click();
    }
  });
  if (
    !result.themeChanged ||
    !result.colorChanged ||
    result.label !== "Dark mode"
  ) {
    throw new Error(
      "The sign-in theme toggle did not switch the page palette.",
    );
  }
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
  assertVersionedAppScriptAvailableOffline,
  assertThemeToggleWorks,
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
};
