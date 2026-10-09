/* Prepare account, property, ledger, and schedule data for account details. */
(() => {
  "use strict";

  function createAccountDetailsModel({
    getAccount,
    getProperty,
    getPaymentsForAccount,
    sumPosted,
    summarizeAccount,
    amortizationSchedule,
    propertyAddress,
  }) {
    function buildAccountDetailData(id) {
      const account = getAccount(id);
      if (!account) return null;

      const property = getProperty(account.property_id);
      const payments = getPaymentsForAccount(id);
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
      const financials = summarizeAccount(account, payments);

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
