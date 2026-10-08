async function installSignedInWorkspaceFixture(signedInPage) {
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
      user_id: "smoke-workspace",
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
    const smokeUser = {
      id: "smoke-user",
      email: "smoke@example.invalid",
      user_metadata: { display_name: "Browser smoke test" },
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
                user: smokeUser,
              },
            },
            error: null,
          }),
          getUser: async () => ({ data: { user: smokeUser }, error: null }),
          updateUser: async ({ data }) => {
            smokeUser.user_metadata = {
              ...smokeUser.user_metadata,
              ...data,
            };
            return { data: { user: smokeUser }, error: null };
          },
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
}

module.exports = { installSignedInWorkspaceFixture };
