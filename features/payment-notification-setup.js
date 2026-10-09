/* Project only the workspace fields needed for payment notifications. */
(() => {
  "use strict";

  function createPaymentNotificationSetup({ records, ui, services, workflow }) {
    return workflow.create({
      getWorkspaceIdentity: () => ({
        ownerId: records.getWorkspaceOwnerId(),
        viewerId: records.getUser()?.id,
      }),
      getPaymentNotificationData: () => ({
        members: records
          .getWorkspaceMembers()
          .map(({ member_user_id, display_name, email }) => ({
            member_user_id,
            display_name,
            email,
          })),
        accounts: records.getAccounts().map(({ id, property_id }) => ({
          id,
          property_id,
        })),
        properties: records
          .getProperties()
          .map(({ id, address, city, state, postal_code }) => ({
            id,
            address,
            city,
            state,
            postal_code,
          })),
      }),
      getClient: services.getClient,
      toast: ui.toast,
      money: ui.money,
      propertyAddress: ui.propertyAddress,
      refresh: services.refresh,
    });
  }

  window.PropertyDeskPaymentNotificationSetup = Object.freeze({
    create: createPaymentNotificationSetup,
  });
})();
