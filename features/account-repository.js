/* Persist account records without owning form or workspace behavior. */
(() => {
  "use strict";

  const { saveById, updateById } = window.PropertyDeskRepositoryQueryUtils;

  function save(client, payload, accountId) {
    return saveById(client, "pd_accounts", payload, accountId);
  }

  function close(client, accountId) {
    return updateById(client, "pd_accounts", accountId, {
      status: "closed",
    });
  }

  window.PropertyDeskAccountRepository = Object.freeze({ save, close });
})();
