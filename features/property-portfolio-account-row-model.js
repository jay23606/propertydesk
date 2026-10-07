/* Derive one account's financial and reminder fields for the Properties grid. */
(() => {
  "use strict";

  function createAccountRowModel({
    state,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    monthStart,
    monthEnd,
    paymentStatusInMonth,
    reminderModel,
  }) {
    const { summarizeAccount } =
      window.PropertyDeskAccountFinancialSummary.create({
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
      });

    function buildAccountRow(property, account, street) {
      const { unpaidDue, loanBalance, hasLoanBalance } = summarizeAccount(
        account,
        state.payments,
      );
      const scheduledPayment = monthlyScheduledEstimate([
        { ...account, status: "active" },
      ]);
      const partyName = account.party_name || account.name;
      const { reminderHref, recipientHint } =
        reminderModel.buildReminderDetails(property, account, unpaidDue);
      const scheduledThisMonth =
        amountDueSince(
          [{ ...account, status: "active" }],
          [],
          monthStart(),
          monthEnd(),
        ) || Number(account.payment_amount || 0);
      const paymentStatus = paymentStatusInMonth(
        state.payments,
        account.id,
        monthStart(),
        scheduledThisMonth,
      );
      return {
        hasAccount: true,
        party: partyName,
        account: account.name,
        address: street,
        id: account.id,
        property,
        accountRecord: account,
        street,
        unpaidDue,
        scheduledPayment,
        loanBalance,
        hasLoanBalance,
        partyName,
        paymentStatus,
        reminderHref,
        recipientHint,
      };
    }

    return { buildAccountRow };
  }

  window.PropertyDeskPropertyPortfolioAccountRowModel = Object.freeze({
    create: createAccountRowModel,
  });
})();
