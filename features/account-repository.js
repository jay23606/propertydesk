/* Persist account records without owning form or workspace behavior. */
(() => {
  "use strict";

  function save(client, payload, accountId) {
    return accountId
      ? client.from("pd_accounts").update(payload).eq("id", accountId)
      : client.from("pd_accounts").insert(payload);
  }

  function close(client, accountId) {
    return client
      .from("pd_accounts")
      .update({ status: "closed" })
      .eq("id", accountId);
  }

  window.PropertyDeskAccountRepository = Object.freeze({ save, close });
})();
