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
    propertyAddress,
    monthStart,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    paymentStatusInMonth,
    money,
  }) {
    function buildAccountRow(property, account, street) {
      const unpaidDue = amountDueSince(
        [account],
        state.payments,
        unpaidDueAccrualStart(),
        todayIso(),
      );
      const scheduledPayment = monthlyScheduledEstimate([
        { ...account, status: "active" },
      ]);
      const partyName = account.party_name || account.name;
      const address = propertyAddress(property);
      const reminderHref = lateReminderMailto({
        email: account.party_email,
        address,
        unpaidDue: money(unpaidDue),
        senderName:
          state.user?.user_metadata?.display_name?.trim() || "PropertyDesk",
        recipientName: partyName,
        month: dateOnly(monthStart()).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        asOf: monthEnd(),
      });
      const recipientHint = account.party_email
        ? "Draft late reminder email"
        : "No email saved; opens an unaddressed late reminder draft";
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
      const hasLoanBalance = account.account_type !== "rental";

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
        loanBalance: hasLoanBalance ? accountBalance(account) : 0,
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
