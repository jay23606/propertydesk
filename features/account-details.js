/* Coordinate account lookup, ledger preparation, history, and modal state. */
(() => {
  "use strict";

  function createAccountDetails(context) {
    const {
      $, state, isPosted, accountBalance, amortizationSchedule, amountDueSince,
      unpaidDueAccrualStart, todayIso, openModal, propertyAddress,
      depositSectionHTML, renderAccountHistory, renderAccountDetails,
      fmtDate,
    } = context;

    async function openAccountDetails(id) {
      const auditRequestId = ++state.auditRequestId;
      const account = state.accounts.find((row) => row.id === id);
      if (!account) return;
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
      const historyHTML = await renderAccountHistory(account, payments);
      if (auditRequestId !== state.auditRequestId) return;

      const unpaidStart = unpaidDueAccrualStart();
      const postedPayments = payments.filter(isPosted);
      $("detail-title").textContent = account.name;
      $("detail-content").innerHTML = renderAccountDetails({
        account,
        propertyName: property?.name || "—",
        propertyAddressText: propertyAddress(property || {}),
        postedPaymentTotal: postedPayments.reduce(
          (total, payment) => total + Number(payment.amount),
          0,
        ),
        estimatedLoanBalance:
          account.account_type === "rental" ? null : accountBalance(account),
        unpaidDue: amountDueSince(
          [account], state.payments, unpaidStart, todayIso(),
        ),
        unpaidSinceLabel: fmtDate(unpaidStart, {
          month: "short", day: "numeric", year: "numeric",
        }),
        depositHTML: depositSectionHTML(account),
        schedule,
        historyHTML,
        payments,
      });
      openModal("detail-modal");
    }

    return { openAccountDetails };
  }

  window.PropertyDeskAccountDetails = Object.freeze({ create: createAccountDetails });
})();
