/* Coordinate property lookup, modal state, and property detail rendering. */
(() => {
  "use strict";

  function createPropertyDetails(context) {
    const {
      $,
      state,
      openModal,
      propertyAddress,
      renderPropertyActivity,
      propertyDetailsHTML,
    } = context;

    function openPropertyDetails(id) {
      state.auditRequestId++;
      const property = state.properties.find((x) => x.id === id);
      if (!property) return;
      state.selectedPropertyId = id;
      const accounts = state.accounts.filter(
        (account) => account.property_id === id,
      );
      const activity = renderPropertyActivity(id, accounts);
      $("property-detail-title").textContent = property.name;
      $("property-detail-address").textContent = propertyAddress(property);
      $("property-detail-add-income").disabled = !accounts.some(
        (a) => a.status === "active",
      );
      const propertyDocs = state.documents.filter(
        (doc) => doc.property_id === id,
      );
      $("property-detail-content").innerHTML = propertyDetailsHTML({
        property,
        accounts,
        propertyDocs,
        workspaceMembers: state.workspaceMembers,
        propertyHolders: state.propertyHolders,
        incomeTotal: activity.incomeTotal,
        expenseTotal: activity.expenseTotal,
        activityHTML: activity.html,
      });
      $("property-archive-toggle").textContent = property.archived_at
        ? "Restore property"
        : "Archive property";
      openModal("property-detail-modal");
    }

    return { openPropertyDetails };
  }

  window.PropertyDeskPropertyDetails = Object.freeze({
    create: createPropertyDetails,
  });
})();
