/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  const numericFields = new Set([
    "payment_amount",
    "original_principal",
    "principal_interest_amount",
    "escrow_amount",
    "ledger_opening_balance",
    "interest_rate",
    "late_fee",
  ]);

  function matchesPayload(row, payload) {
    return Object.entries(payload).every(([key, value]) => {
      const actual = row[key];
      if (value == null) return actual == null;
      if (numericFields.has(key)) return Number(actual) === Number(value);
      return actual === value;
    });
  }

  function create({ state, fetchAll, toast, repository }) {
    function saveAccount(payload, accountId) {
      const previousCount = accountId
        ? null
        : (state?.accounts || []).filter((row) => matchesPayload(row, payload))
            .length;
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.save(payload, accountId),
        toast,
        failureMessage:
          "Account save result couldn't be confirmed. Reload Properties before trying again.",
        ...(state && fetchAll
          ? {
              onUnconfirmed: async () => {
                let accountWasSaved = false;
                const refreshed =
                  await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace(
                    {
                      fetchAll,
                      afterRefresh: () => {
                        const accounts = state.accounts || [];
                        accountWasSaved = accountId
                          ? accounts.some(
                              (row) =>
                                row.id === accountId &&
                                matchesPayload(row, payload),
                            )
                          : accounts.filter((row) =>
                              matchesPayload(row, payload),
                            ).length > previousCount;
                      },
                      toast,
                      refreshFailureMessage:
                        "Account save result couldn't be confirmed, and Properties could not refresh. Reload before trying again.",
                    },
                  );
                if (!refreshed) return false;
                if (!accountWasSaved) {
                  toast(
                    "Properties were refreshed. Check the account before trying to save it again.",
                  );
                }
                return accountWasSaved;
              },
            }
          : {}),
      });
    }

    return Object.freeze({ saveAccount });
  }

  window.PropertyDeskAccountFormMaintenance = Object.freeze({ create });
})();
