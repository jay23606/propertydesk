/* Validate financing and schedule terms from account import rows. */
(() => {
  "use strict";

  function create({ modules }) {
    const { csvMoney, csvRate, validIsoDate } = modules.csvValueUtils;
    const { paymentFrequencies, propertyKinds, defaults } =
      modules.domainOptions;
    const paymentFrequencyValues = new Set(
      paymentFrequencies.map(({ value }) => value),
    );
    const propertyKindValues = new Set(propertyKinds.map(({ value }) => value));

    function accountLoanFields(row, type) {
      if (type === "rental")
        return { principal: 0, principalInterestAmount: null, escrowAmount: 0 };

      const principalInterestAmount = row.principal_interest_amount
        ? csvMoney(
            row.principal_interest_amount,
            `${row.account_name} P&I payment`,
          )
        : null;
      return {
        principal: csvMoney(
          row.original_principal,
          `${row.account_name} principal`,
          { optional: true },
        ),
        principalInterestAmount,
        escrowAmount: csvMoney(
          row.escrow_amount,
          `${row.account_name} monthly escrow`,
          { optional: true },
        ),
      };
    }

    function openingBalanceFields(row) {
      const openingBalance =
        (row.ledger_opening_balance || "").trim() === ""
          ? null
          : csvMoney(
              row.ledger_opening_balance,
              `${row.account_name} opening balance`,
            );
      if (openingBalance !== null && !row.ledger_opening_date)
        throw new Error(
          `A ledger opening date is required when an opening balance is set for ${row.account_name}.`,
        );
      return openingBalance;
    }

    function accountFinancialFields(row, type) {
      const amount = csvMoney(
        row.payment_amount,
        `${row.account_name} payment amount`,
        { optional: true },
      );
      const loan = accountLoanFields(row, type);
      const openingBalance = openingBalanceFields(row);
      const rate = csvRate(
        row.interest_rate,
        `${row.account_name} interest rate`,
        { optional: true },
      );
      return { amount, ...loan, openingBalance, rate };
    }

    function validateAccountDates(row, frequency, startDate) {
      if (
        !paymentFrequencyValues.has(frequency) ||
        !validIsoDate(startDate) ||
        [row.next_due_date, row.balloon_date, row.ledger_opening_date].some(
          (date) => date && !validIsoDate(date),
        )
      )
        throw new Error(
          `Invalid payment frequency or date for ${row.account_name}.`,
        );
    }

    function accountTermFields(row) {
      const term = row.term_months ? Number(row.term_months) : null,
        graceDays = Number(row.grace_days || 0);
      if (term !== null && (!Number.isInteger(term) || term < 1))
        throw new Error(
          `Term months must be a positive whole number for ${row.account_name}.`,
        );
      if (!Number.isInteger(graceDays) || graceDays < 0)
        throw new Error(
          `Grace days must be a nonnegative whole number for ${row.account_name}.`,
        );
      return { term, graceDays };
    }

    function accountPropertyKind(row) {
      const propertyKind = row.property_kind || defaults.propertyKind;
      if (!propertyKindValues.has(propertyKind))
        throw new Error(
          `Invalid property_kind “${row.property_kind}” for ${row.property_name}.`,
        );
      return propertyKind;
    }

    function scheduleFields(row, today) {
      const frequency = row.payment_frequency || defaults.paymentFrequency,
        startDate = row.start_date || today;
      validateAccountDates(row, frequency, startDate);
      const { term, graceDays } = accountTermFields(row);
      const propertyKind = accountPropertyKind(row);
      return { frequency, startDate, term, graceDays, propertyKind };
    }

    return Object.freeze({
      financialFields: accountFinancialFields,
      scheduleFields,
    });
  }

  const api = Object.freeze({ create });
  globalThis.PropertyDeskAccountImportTerms = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
