/* Project workspace records to the fields used by the reminder activity view. */
(() => {
  "use strict";

  function createWorkspaceReminderActivityData({
    getAccounts,
    getProperties,
    getReminderLogs,
  }) {
    function getActivityData() {
      return {
        accounts: getAccounts().map(
          ({ id, property_id, party_name, name }) => ({
            id,
            property_id,
            party_name,
            name,
          }),
        ),
        properties: getProperties().map(({ id, address, name }) => ({
          id,
          address,
          name,
        })),
        reminderLogs: getReminderLogs().map(
          ({
            account_id,
            reminder_month,
            recipient_index,
            status,
            reason,
            unpaid_due,
            attempted_at,
          }) => ({
            account_id,
            reminder_month,
            recipient_index,
            status,
            reason,
            unpaid_due,
            attempted_at,
          }),
        ),
      };
    }

    return Object.freeze({ getActivityData });
  }

  window.PropertyDeskWorkspaceReminderActivityData = Object.freeze({
    create: createWorkspaceReminderActivityData,
  });
})();
