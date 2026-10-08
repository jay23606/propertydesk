/* Build manual late-reminder details for one Properties grid account row. */
(() => {
  "use strict";

  function createPropertyPortfolioReminderModel({
    state,
    propertyAddress,
    monthStart,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    money,
  }) {
    function buildReminderDetails(property, account, unpaidDue) {
      const partyName = account.party_name || account.name;
      const reminderHref = lateReminderMailto({
        email: account.party_email,
        address: propertyAddress(property),
        subjectAddress: property.address,
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

      return { reminderHref, recipientHint };
    }

    return Object.freeze({ buildReminderDetails });
  }

  window.PropertyDeskPropertyPortfolioReminderModel = Object.freeze({
    create: createPropertyPortfolioReminderModel,
  });
})();
