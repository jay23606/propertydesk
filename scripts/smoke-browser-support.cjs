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

async function assertVersionedShellAssetsAvailableOffline(page, context) {
  const assets = await page.evaluate(() => {
    const appScript = Array.from(document.scripts).find(
      (item) => item.src && new URL(item.src).pathname.endsWith("/app.js"),
    );
    const themeStylesheet = Array.from(document.querySelectorAll("link[href]"))
      .map((item) => item.href)
      .find((href) => new URL(href).pathname.endsWith("/theme.css"));
    if (!appScript) throw new Error("The app script is missing from the page.");
    if (!themeStylesheet)
      throw new Error("The theme stylesheet is missing from the page.");
    return [
      {
        label: "app script",
        url: appScript.src,
        expected: "PropertyDesk",
      },
      {
        label: "theme stylesheet",
        url: themeStylesheet,
        expected: 'html[data-theme="dark"]',
      },
    ].map((asset) => {
      const url = new URL(asset.url);
      url.searchParams.set("offline-smoke", "versioned-shell");
      return { ...asset, url: url.href };
    });
  });
  await context.setOffline(true);
  try {
    for (const asset of assets) {
      const response = await page.evaluate(async (assetURL) => {
        const result = await fetch(assetURL, { cache: "reload" });
        return {
          ok: result.ok,
          status: result.status,
          body: await result.text(),
        };
      }, asset.url);
      if (!response.ok || !response.body.includes(asset.expected)) {
        throw new Error(
          `The versioned ${asset.label} was unavailable offline (HTTP ${response.status}).`,
        );
      }
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
  assertVersionedShellAssetsAvailableOffline,
  assertThemeToggleWorks,
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
};
