/* Coordinate property lookup, modal state, and property detail rendering. */
(() => {
  "use strict";

  function createPropertyDetails(context) {
    const {
      $,
      state,
      openModal,
      buildPropertyDetailData,
      renderPropertyActivity,
      propertyDetailsHTML,
    } = context;

    function openPropertyDetails(id) {
      state.auditRequestId++;
      const detailData = buildPropertyDetailData(id);
      if (!detailData) return;
      const {
        property,
        accounts,
        propertyDocs,
        workspaceMembers,
        propertyHolders,
      } = detailData;
      state.selectedPropertyId = id;
      const activity = renderPropertyActivity(id, accounts);
      $("property-detail-title").textContent = property.name;
      $("property-detail-address").textContent = detailData.propertyAddressText;
      $("property-detail-add-income").disabled = !detailData.hasActiveAccount;
      $("property-detail-content").innerHTML = propertyDetailsHTML({
        property,
        accounts,
        propertyDocs,
        workspaceMembers,
        propertyHolders,
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
