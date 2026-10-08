/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  const numericFields = new Set([
    "amount",
    "principal_amount",
    "interest_amount",
    "fee_amount",
    "escrow_amount",
    "unapplied_amount",
  ]);

  function payloadMatches(row, payload) {
    return Object.entries(payload).every(([key, value]) => {
      const actual = row[key];
      if (value == null) return actual == null;
      if (numericFields.has(key)) return Number(actual) === Number(value);
      return actual === value;
    });
  }

  function create({ state, fetchAll, toast, repository }) {
    async function runInsert(operation, failureMessage, rowsKey, payload) {
      const rows = state?.[rowsKey];
      const previousCount = rows
        ? rows.filter((row) => payloadMatches(row, payload)).length
        : null;
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation,
        toast,
        failureMessage,
        ...(rows && fetchAll
          ? {
              onUnconfirmed: async () => {
                let entryWasAdded = false;
                const refreshed =
                  await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace(
                    {
                      fetchAll,
                      afterRefresh: () => {
                        entryWasAdded =
                          state[rowsKey].filter((row) =>
                            payloadMatches(row, payload),
                          ).length > previousCount;
                      },
                      toast,
                      refreshFailureMessage: failureMessage,
                    },
                  );
                if (!refreshed) return false;
                if (!entryWasAdded) {
                  toast(
                    "Ledger was refreshed. Check it before recording this entry again.",
                  );
                  return false;
                }
                return true;
              },
            }
          : {}),
      });
    }

    function insertPayment({ payload, failureMessage }) {
      return runInsert(
        () => repository.insertPayment(payload),
        failureMessage,
        "payments",
        payload,
      );
    }

    function insertExpense({ payload, failureMessage }) {
      return runInsert(
        () => repository.insertExpense(payload),
        failureMessage,
        "expenses",
        payload,
      );
    }

    return Object.freeze({ insertPayment, insertExpense });
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
