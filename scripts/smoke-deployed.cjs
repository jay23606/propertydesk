const { chromium } = require("playwright");

async function reloadThroughServiceWorker(page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("This browser does not support the PropertyDesk app shell.");
    }
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      throw new Error("The PropertyDesk service worker did not become active.");
    }
  });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
    timeout: 30000,
  });
}

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error("Pass the deployed PropertyDesk URL as an argument.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
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
    await page.locator("#auth-title").waitFor({ state: "visible", timeout: 30000 });
    await reloadThroughServiceWorker(page);

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
                        return { limit: async () => ({ data: [], error: null }) };
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
      const feature = details.create({
        $: (id) => document.getElementById(id),
        state,
        isPosted: () => true,
        sumIncome: () => 0,
        sumOperatingExpenses: () => 0,
        money,
        fmtDate: (value, options) => value
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
        openModal() {},
        closeModal() {},
        editAccount() {},
        openPayment() {},
        openExpense() {},
        resetAccountForm() {},
        populateFormOptions() {},
        deleteAccount() {},
        propertyAddress: (property) => property.name,
      });

      await feature.openAccountDetails(account.id);
      return document.getElementById("detail-content").innerText;
    });

    if (!detailText.includes("Estimated amortization schedule")) {
      throw new Error("The note detail did not render its amortization schedule.");
    }

    const signedInContext = await browser.newContext();
    const signedInPageErrors = [];
    const signedInConsoleErrors = [];
    const signedInPage = await signedInContext.newPage();
    signedInPage.on("pageerror", (error) => signedInPageErrors.push(error.message));
    signedInPage.on("console", (message) => {
      if (message.type() === "error") signedInConsoleErrors.push(message.text());
    });
    await signedInPage.route("**/@supabase/supabase-js@2*", (route) =>
      route.fulfill({ contentType: "text/javascript", body: "" }),
    );
    await signedInPage.route("**/config.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: 'window.PROPERTYDESK_CONFIG = { supabaseUrl: "https://smoke.invalid", supabaseAnonKey: "smoke" };',
      }),
    );
    await signedInPage.addInitScript(() => {
      const property = {
        id: "smoke-property",
        name: "Browser smoke-test property",
        address: "10 Smoke Street",
        city: "Testville",
        state: "PA",
        postal_code: "00000",
        property_kind: "residential",
        archived_at: null,
      };
      const account = {
        id: "smoke-account",
        property_id: property.id,
        name: "Browser smoke-test note",
        party_name: "Smoke Test Buyer",
        account_type: "note",
        original_principal: 10000,
        interest_rate: 5,
        term_months: 360,
        start_date: "2025-01-01",
        payment_amount: 53.68,
        payment_frequency: "monthly",
        status: "active",
        next_due_date: "2026-10-01",
      };
      const rows = {
        pd_properties: [property],
        pd_accounts: [account],
        pd_payments: [],
        pd_expenses: [],
        pd_import_batches: [],
        pd_documents: [],
        pd_agreement_versions: [],
        pd_property_holders: [],
        pd_deposit_entries: [],
        pd_reminder_logs: [],
        pd_audit_events: [],
      };
      function queryFor(table) {
        const result = { data: rows[table] || [], error: null };
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          in: () => query,
          limit: () => Promise.resolve(result),
          then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        };
        return query;
      }
      window.supabase = {
        createClient: () => ({
          auth: {
            onAuthStateChange() {},
            getSession: async () => ({
              data: {
                session: {
                  access_token: "smoke-token",
                  user: {
                    id: "smoke-user",
                    email: "smoke@example.invalid",
                    user_metadata: { display_name: "Browser smoke test" },
                  },
                },
              },
              error: null,
            }),
          },
          rpc: async (name) => ({
            data: name === "pd_workspace_id" ? "smoke-workspace" : [],
            error: null,
          }),
          from: queryFor,
        }),
      };
    });

    await signedInPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await reloadThroughServiceWorker(signedInPage);
    await signedInPage
      .locator('#accounts-table [data-property-open="smoke-property"]')
      .waitFor({ state: "visible", timeout: 30000 });
    await signedInPage
      .locator('#accounts-table [data-property-open="smoke-property"]')
      .click();
    await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
    await signedInPage
      .locator('#property-detail-content [data-detail="smoke-account"]')
      .click();
    await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
    const signedInDetail = await signedInPage.locator("#detail-content").innerText();
    if (!signedInDetail.includes("Estimated amortization schedule")) {
      throw new Error("The signed-in app did not open the smoke note schedule through the Properties UI.");
    }
    if (signedInPageErrors.length || signedInConsoleErrors.length) {
      throw new Error(
        `Signed-in app browser errors: ${[...signedInPageErrors, ...signedInConsoleErrors].join(" | ")}`,
      );
    }
    if (runtimeErrors.length) {
      throw new Error(`Uncaught browser errors: ${runtimeErrors.join(" | ")}`);
    }
    if (consoleErrors.length) {
      throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
    }
    console.log("Deployed PropertyDesk loaded and rendered a note amortization detail in the signed-in app without browser errors.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
