/* Derive one account's financial and reminder fields for the Properties grid. */
(() => {
  "use strict";

  function createAccountRowModel({
    state,
    monthlyScheduledEstimate,
    summarizeAccount,
    amountDueSince,
    monthStart,
    monthEnd,
    paymentStatusInMonth,
    reminderModel,
  }) {
    function scheduledAccount(account) {
      return {
        id: account.id,
        status: "active",
        payment_amount: account.payment_amount,
        payment_frequency: account.payment_frequency,
        start_date: account.start_date,
        next_due_date: account.next_due_date,
      };
    }

    function buildAccountRow(property, account, street) {
      const { unpaidDue, loanBalance, hasLoanBalance } = summarizeAccount(
        account,
        state.payments,
      );
      const scheduleAccount = scheduledAccount(account);
      const scheduledPayment = monthlyScheduledEstimate([scheduleAccount]);
      const partyName = account.party_name || account.name;
      const { reminderHref, textReminderHref, recipientHint } =
        reminderModel.buildReminderDetails(property, account, unpaidDue);
      const scheduledThisMonth =
        amountDueSince([scheduleAccount], [], monthStart(), monthEnd()) ||
        Number(account.payment_amount || 0);
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
        textReminderHref,
        recipientHint,
      };
    }

    return Object.freeze({ buildAccountRow });
  }

  window.PropertyDeskPropertyPortfolioAccountRowModel = Object.freeze({
    create: createAccountRowModel,
  });
})();
