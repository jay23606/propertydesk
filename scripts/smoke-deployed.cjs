const { chromium } = require("playwright");

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error("Pass the deployed PropertyDesk URL as an argument.");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#auth-title").waitFor({ state: "visible", timeout: 30000 });

    const detailText = await page.evaluate(async () => {
      const utilities = window.PropertyDeskLedgerUtils;
      const details = window.PropertyDeskDetailViews;
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
    if (runtimeErrors.length) {
      throw new Error(`Uncaught browser errors: ${runtimeErrors.join(" | ")}`);
    }
    console.log("Deployed PropertyDesk loaded and rendered a note amortization detail without uncaught browser errors.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
