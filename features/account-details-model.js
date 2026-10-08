/* Prepare account, property, ledger, and schedule data for account details. */
(() => {
  "use strict";

  function createAccountDetailsModel({
    state,
    sumPosted,
    summarizeAccount,
    amortizationSchedule,
    propertyAddress,
  }) {
    function buildAccountDetailData(id) {
      const account = state.accounts.find((row) => row.id === id);
      if (!account) return null;

      const property = state.properties.find(
        (row) => row.id === account.property_id,
      );
      const payments = state.payments.filter((row) => row.account_id === id);
      const schedule =
        account.account_type === "rental"
          ? []
          : amortizationSchedule(
              account.original_principal,
              account.interest_rate,
              account.term_months,
              account.start_date,
              account.principal_interest_amount,
            );
      const financials = summarizeAccount(account, state.payments);

      return {
        account,
        propertyName: property?.name || "—",
        propertyAddressText: propertyAddress(property || {}),
        payments,
        postedPaymentTotal: sumPosted(payments),
        estimatedLoanBalance: financials.hasLoanBalance
          ? financials.loanBalance
          : null,
        unpaidDue: financials.unpaidDue,
        unpaidStart: financials.unpaidStart,
        schedule,
      };
    }

    return Object.freeze({ buildAccountDetailData });
  }

  window.PropertyDeskAccountDetailsModel = Object.freeze({
    create: createAccountDetailsModel,
  });
})();
