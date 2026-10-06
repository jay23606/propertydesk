/* Prepare account, property, ledger, and schedule data for account details. */
(() => {
  "use strict";

  function createAccountDetailsModel({
    state,
    sumPosted,
    accountBalance,
    amortizationSchedule,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
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
      const unpaidStart = unpaidDueAccrualStart();

      return {
        account,
        propertyName: property?.name || "—",
        propertyAddressText: propertyAddress(property || {}),
        payments,
        postedPaymentTotal: sumPosted(payments),
        estimatedLoanBalance:
          account.account_type === "rental" ? null : accountBalance(account),
        unpaidDue: amountDueSince(
          [account],
          state.payments,
          unpaidStart,
          todayIso(),
        ),
        unpaidStart,
        schedule,
      };
    }

    return { buildAccountDetailData };
  }

  window.PropertyDeskAccountDetailsModel = Object.freeze({
    create: createAccountDetailsModel,
  });
})();
