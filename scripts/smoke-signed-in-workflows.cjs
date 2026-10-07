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
    const rental = {
      id: "smoke-rental",
      property_id: property.id,
      name: "Browser smoke-test rental",
      party_name: "Smoke Test Tenant",
      account_type: "rental",
      payment_amount: 800,
      payment_frequency: "monthly",
      start_date: "2025-01-01",
      status: "active",
      next_due_date: "2026-10-01",
    };
    const rows = {
      pd_properties: [property],
      pd_accounts: [account, rental],
      pd_payments: [
        {
          id: "smoke-payment",
          account_id: rental.id,
          amount: 800,
          received_date: "2026-10-04",
          payment_method: "manual",
          income_category: "rent",
          status: "posted",
          memo: "October smoke payment",
        },
      ],
      pd_expenses: [
        {
          id: "smoke-expense",
          property_id: property.id,
          amount: 25,
          expense_date: "2026-10-03",
          category: "repair",
          status: "posted",
          payee: "Smoke-test repair",
        },
      ],
      pd_import_batches: [],
      pd_documents: [],
      pd_agreement_versions: [],
      pd_property_holders: [],
      pd_deposit_entries: [],
      pd_reminder_logs: [],
      pd_audit_events: [],
    };
    window.__smokeRows = rows;
    function queryFor(table) {
      const result = { data: rows[table] || [], error: null };
      const filters = [];
      let updatePayload = null;
      const matchingRows = () =>
        (rows[table] || []).filter((row) =>
          filters.every(([column, value]) => row[column] === value),
        );
      const applyUpdate = () => {
        const matches = matchingRows();
        for (const row of matches) Object.assign(row, updatePayload);
        return matches;
      };
      const query = {
        select: () => query,
        insert: async (payload) => {
          rows[table].push({
            id: `smoke-${table}-${rows[table].length + 1}`,
            ...payload,
          });
          return { error: null };
        },
        update: (payload) => {
          updatePayload = payload;
          return query;
        },
        eq: (column, value) => {
          filters.push([column, value]);
          return query;
        },
        order: () => query,
        in: () => query,
        maybeSingle: async () => {
          const row = updatePayload ? applyUpdate()[0] : matchingRows()[0];
          return { data: row ? { id: row.id } : null, error: null };
        },
        limit: () => Promise.resolve(result),
        then: (resolve, reject) => {
          if (updatePayload) applyUpdate();
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    }
    window.__smokeRpcCalls = [];
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
        rpc: async (name, args) => {
          window.__smokeRpcCalls.push({ name, args });
          return {
            data: name === "pd_workspace_id" ? "smoke-workspace" : [],
            error: null,
          };
        },
        from: queryFor,
      }),
    };
  });

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
