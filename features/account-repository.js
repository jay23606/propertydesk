/* Persist account records without owning form or workspace behavior. */
(() => {
  "use strict";

  function create({ getClient, queryUtils }) {
    const { saveById, updateById } = queryUtils;

    function save(payload, accountId) {
      return saveById(getClient(), "pd_accounts", payload, accountId);
    }

    function close(accountId) {
      return updateById(getClient(), "pd_accounts", accountId, {
        status: "closed",
      });
    }

    return Object.freeze({ save, close });
  }

  window.PropertyDeskAccountRepository = Object.freeze({ create });
})();
