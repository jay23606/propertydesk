const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
} = require("./smoke-browser-support.cjs");

async function smokeAccountAmortization(page, runtimeErrors, consoleErrors) {
  console.log("Smoke: checking account amortization rendering.");
  const detailText = await page.evaluate(async () => {
    const utilities = window.PropertyDeskLoanAmortizationUtils?.create({
      monthDateWithAnchor: window.PropertyDeskDateUtils.monthDateWithAnchor,
      isoDate: window.PropertyDeskDateUtils.isoDate,
      roundCurrency: window.PropertyDeskCurrencyUtils.roundCurrency,
      todayIso: () => "2026-10-08",
    });
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
    const fmtDate = (value, options) =>
      value
        ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", options)
        : "—";
    const { accountLoanScheduleHTML } =
      window.PropertyDeskAccountLoanScheduleView.create({ money, fmtDate });
    const renderAccountDetails = window.PropertyDeskAccountDetailsView.create({
      money,
      fmtDate,
      esc: (value) => String(value ?? ""),
      prettyType: (type) => type,
      paymentFrequencyLabel: () => "Monthly",
      accountLoanScheduleHTML,
    }).renderAccountDetails;
    const { buildAccountDetailData } =
      window.PropertyDeskAccountDetailsModel.create({
        state,
        sumPosted: (rows) =>
          rows
            .filter((payment) => !payment.status || payment.status === "posted")
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        summarizeAccount: window.PropertyDeskAccountFinancialSummary.create({
          accountBalance: () => 10000,
          amountDueSince: () => 0,
          unpaidDueAccrualStart: () => "2026-01-01",
          todayIso: () => "2026-01-01",
        }).summarizeAccount,
        amortizationSchedule: utilities.amortizationSchedule,
        propertyAddress: (property) => property.name,
      });
    const feature = details.create({
      $: (id) => document.getElementById(id),
      state,
      buildAccountDetailData,
      fmtDate: (value, options) =>
        value
          ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", options)
          : "—",
      depositSectionHTML: () => "",
      renderAccountHistory: async () => "",
      renderAccountDetails,
      openModal() {},
    });

    await feature.openAccountDetails(account.id);
    return document.getElementById("detail-content").innerText;
  });

  if (!detailText.includes("Estimated amortization schedule")) {
    throw new Error(
      "The note detail did not render its amortization schedule.",
    );
  }

  assertNoBrowserErrors(runtimeErrors, consoleErrors, "Amortization rendering");
  await assertNoUnhandledRejections(page, "Amortization rendering");
}

module.exports = { smokeAccountAmortization };
