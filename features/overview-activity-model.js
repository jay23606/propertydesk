/* Build the dashboard's upcoming-payment and recent-payment lists. */
(() => {
  "use strict";

  function createOverviewActivityModel({ isPosted }) {
    function upcomingPayments(accounts, propertyById) {
      return accounts
        .filter(
          (account) => account.status === "active" && account.next_due_date,
        )
        .sort((a, b) =>
          String(a.next_due_date).localeCompare(String(b.next_due_date)),
        )
        .slice(0, 4)
        .map((account) => ({
          account,
          property: propertyById.get(account.property_id),
        }));
    }

    function recentPayments(payments, accountById, propertyById) {
      return payments
        .filter(isPosted)
        .slice(0, 4)
        .map((payment) => {
          const account = accountById.get(payment.account_id);
          return {
            payment,
            account,
            property: propertyById.get(account?.property_id),
          };
        });
    }

    return Object.freeze({ upcomingPayments, recentPayments });
  }

  window.PropertyDeskOverviewActivityModel = Object.freeze({
    create: createOverviewActivityModel,
  });
})();
