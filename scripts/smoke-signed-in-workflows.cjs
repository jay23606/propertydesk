const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
  captureUnhandledRejections,
  reloadThroughServiceWorker,
} = require("./smoke-browser-support.cjs");

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
  console.log("Smoke: checking property, payment, and account details.");
  await signedInPage.locator('.nav-link[data-view="overview"]').click();
  await signedInPage
    .locator('#overview-properties [data-property-card="smoke-property"]')
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#property-detail-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator('#overview-properties [data-property-payment="smoke-property"]')
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#payment-modal button[data-close]")
    .first()
    .click();
  await signedInPage.locator('.nav-link[data-view="properties"]').click();
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#property-detail-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator("#property-detail-modal.hidden")
    .waitFor({ state: "hidden" });
  await signedInPage
    .locator('#properties-table [data-account-payment="smoke-account"]')
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  if (
    (await signedInPage.locator("#payment-amount").inputValue()) !== "53.68"
  ) {
    throw new Error(
      "The note payment form did not prefill the scheduled installment amount.",
    );
  }
  await assertNoBrowserErrors(
    signedInPageErrors,
    signedInConsoleErrors,
    "Payment entry",
  );
  await assertNoUnhandledRejections(signedInPage, "Payment entry");
  await signedInPage
    .locator("#payment-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator("#payment-modal.hidden")
    .waitFor({ state: "hidden" });
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  const propertyDetail = await signedInPage
    .locator("#property-detail-content")
    .innerText();
  if (
    !propertyDetail.includes("Recent activity") ||
    !propertyDetail.includes("October smoke payment") ||
    !propertyDetail.includes("Smoke-test repair")
  ) {
    throw new Error(
      "The signed-in app did not render property activity in the Properties details view.",
    );
  }
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-account"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  const signedInDetail = await signedInPage
    .locator("#detail-content")
    .innerText();
  if (!signedInDetail.includes("Estimated amortization schedule")) {
    throw new Error(
      "The signed-in app did not open the smoke note schedule through the Properties UI.",
    );
  }
  await signedInPage.locator("#detail-modal button[data-close]").click();
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-rental"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  const signedInRentalDetail = await signedInPage
    .locator("#detail-content")
    .innerText();
  if (!signedInRentalDetail.includes("Security deposit ledger")) {
    throw new Error(
      "The signed-in app did not render the rental deposit ledger through the Properties UI.",
    );
  }
  if (
    !signedInRentalDetail.includes("Prior agreement terms") ||
    !signedInRentalDetail.includes("Change history")
  ) {
    throw new Error(
      "The signed-in app did not render account history through the Properties UI.",
    );
  }
  const depositPrompts = ["25.00", "Smoke test retention"];
  const acceptDepositPrompts = (dialog) => {
    void dialog.accept(depositPrompts.shift());
    if (!depositPrompts.length)
      signedInPage.off("dialog", acceptDepositPrompts);
  };
  signedInPage.on("dialog", acceptDepositPrompts);
  await signedInPage
    .locator('#detail-content [data-deposit-adjustment="retained"]')
    .click();
  await signedInPage
    .locator("#detail-deposit-section")
    .getByText("Smoke test retention")
    .waitFor({ state: "visible", timeout: 10000 });
  await signedInPage.locator("#detail-modal button[data-close]").click();
  await signedInPage.locator('.nav-link[data-view="payments"]').click();
  console.log("Smoke: checking transaction correction and reporting.");
  signedInPage.once("dialog", (dialog) =>
    dialog.accept("Smoke-test correction"),
  );
  await signedInPage
    .locator(
      '#payments-table [data-correct-transaction][data-id="smoke-payment"]',
    )
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  if (
    (await signedInPage.locator("#payment-modal-title").innerText()) !==
      "Correct payment" ||
    (await signedInPage.locator("#payment-amount").inputValue()) !== "800"
  ) {
    throw new Error(
      "The Transactions view did not open the selected payment in correction mode.",
    );
  }
  await signedInPage.locator("#payment-save-button").click();
  await signedInPage
    .locator("#payment-modal.hidden")
    .waitFor({ state: "hidden" });
  const correctionSaved = await signedInPage.evaluate(() =>
    window.__smokeRpcCalls.some(
      (call) =>
        call.name === "pd_correct_transaction" &&
        call.args.p_kind === "payment" &&
        call.args.p_transaction_id === "smoke-payment",
    ),
  );
  if (!correctionSaved) {
    throw new Error(
      "Saving the payment correction did not reach transaction maintenance.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="reports"]').click();
  const reportPage = await signedInPage.locator("#page-reports").innerText();
  for (const expected of ["$800.00", "$25.00", "$775.00", "Import history"]) {
    if (!reportPage.includes(expected)) {
      throw new Error(
        `The Reports view did not include the expected value: ${expected}.`,
      );
    }
  }
  await signedInPage.locator('.nav-link[data-view="workspace"]').click();
  const workspacePage = await signedInPage
    .locator("#page-workspace")
    .innerText();
  if (
    !workspacePage.includes("Email reminder activity") ||
    !workspacePage.includes("Reminder attempts will appear here")
  ) {
    throw new Error(
      "Workspace settings did not render reminder delivery activity.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="payments"]').click();
  console.log("Smoke: checking transaction voiding and account closure.");
  const handleVoidDialogs = (dialog) => {
    if (dialog.type() === "confirm") {
      void dialog.accept();
    } else {
      void dialog.accept("Smoke-test void");
    }
  };
  signedInPage.on("dialog", handleVoidDialogs);
  await signedInPage
    .locator('#payments-table [data-void-transaction][data-id="smoke-expense"]')
    .click();
  await signedInPage
    .getByText("Transaction voided; original entry preserved")
    .waitFor();
  signedInPage.off("dialog", handleVoidDialogs);
  const expenseVoided = await signedInPage.evaluate(
    () =>
      window.__smokeRows.pd_expenses.find((row) => row.id === "smoke-expense")
        ?.status === "voided",
  );
  if (!expenseVoided) {
    throw new Error(
      "Voiding an expense did not reach transaction maintenance.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="properties"]').click();
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-account"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  signedInPage.once("dialog", (dialog) => dialog.accept());
  await signedInPage
    .locator('[data-account-detail-close="smoke-account"]')
    .click();
  await signedInPage.getByText("Account closed").waitFor();
  const accountClosed = await signedInPage.evaluate(
    () =>
      window.__smokeRows.pd_accounts.find((row) => row.id === "smoke-account")
        ?.status === "closed",
  );
  if (!accountClosed) {
    throw new Error("Closing an account did not reach account maintenance.");
  }
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
