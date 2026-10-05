const { chromium } = require("playwright");
const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
  reloadThroughServiceWorker,
} = require("./smoke-browser-support.cjs");
const { smokeSignedInWorkflows } = require("./smoke-signed-in-workflows.cjs");

async function main() {
  const url = process.argv[2];
  if (!url)
    throw new Error("Pass the deployed PropertyDesk URL as an argument.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
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
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
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
    await reloadThroughServiceWorker(page);
    assertNoBrowserErrors(runtimeErrors, consoleErrors, "Startup");
    await assertNoUnhandledRejections(page, "Startup");

    const detailText = await page.evaluate(async () => {
      const utilities = window.PropertyDeskLedgerUtils;
      const details = window.PropertyDeskAccountDetails;
      if (!utilities || !details) {
        throw new Error("PropertyDesk account detail modules did not load.");
      }

      const account = {
        id: "smoke-account",
        property_id: "smoke-property",
        name: "Browser smoke-test note",
        account_type: "note",
        original_principal: 10000,
        interest_rate: 5,
        term_months: 360,
        start_date: "2025-01-01",
        payment_amount: 53.68,
        payment_frequency: "monthly",
      };
      const state = {
        auditRequestId: 0,
        accounts: [account],
        properties: [{ id: account.property_id, name: "Smoke-test property" }],
        payments: [],
        expenses: [],
        agreementVersions: [],
        client: {
          from() {
            return {
              select() {
                return {
                  in() {
                    return {
                      order() {
                        return {
                          limit: async () => ({ data: [], error: null }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        },
      };
      const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;
      const renderAccountDetails = window.PropertyDeskAccountDetailsView.create(
        {
          money,
          fmtDate: (value, options) =>
            value
              ? new Date(`${value}T12:00:00`).toLocaleDateString(
                  "en-US",
                  options,
                )
              : "—",
          esc: (value) => String(value ?? ""),
          prettyType: (type) => type,
          paymentFrequencyLabel: () => "Monthly",
        },
      ).renderAccountDetails;
      const feature = details.create({
        $: (id) => document.getElementById(id),
        state,
        isPosted: () => true,
        sumIncome: () => 0,
        sumOperatingExpenses: () => 0,
        money,
        fmtDate: (value, options) =>
          value
            ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", options)
            : "—",
        esc: (value) => String(value ?? ""),
        prettyType: (type) => type,
        paymentFrequencyLabel: () => "Monthly",
        accountBalance: () => 10000,
        amortizationSchedule: utilities.amortizationSchedule,
        amountDueSince: () => 0,
        unpaidDueAccrualStart: () => "2026-01-01",
        todayIso: () => "2026-01-01",
        depositLedger: () => ({ entries: [], active: [], totals: {} }),
        depositSectionHTML: () => "",
        renderAccountHistory: async () => "",
        renderAccountDetails,
        openModal() {},
        closeModal() {},
        editAccount() {},
        openPayment() {},
        openExpense() {},
        resetAccountForm() {},
        populateFormOptions() {},
        closeAccount() {},
        propertyAddress: (property) => property.name,
      });

      await feature.openAccountDetails(account.id);
      return document.getElementById("detail-content").innerText;
    });

    if (!detailText.includes("Estimated amortization schedule")) {
      throw new Error(
        "The note detail did not render its amortization schedule.",
      );
    }

    assertNoBrowserErrors(
      runtimeErrors,
      consoleErrors,
      "Amortization rendering",
    );
    await assertNoUnhandledRejections(page, "Amortization rendering");

    await smokeSignedInWorkflows(browser, url);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
