/* Coordinate account and transaction commits with batch recovery. */
(() => {
  "use strict";

  function createImportCommit({ state, fetchAll, status, toast, repository }) {
    const batchReconciliation =
      window.PropertyDeskImportBatchReconciliation.create({
        state,
        fetchAll,
        toast,
      });
    const { finish } = window.PropertyDeskImportCommitReporting.create({
      status,
      fetchAll,
      toast,
    });

    async function commitWithReconciliation({
      operation,
      sourceName,
      total,
      rows,
      label,
      toastMessage,
      collection,
    }) {
      const baselineBatchIds = batchReconciliation.captureBaselineBatchIds(
        sourceName,
        total,
        collection,
      );
      let data;
      try {
        data = await operation();
      } catch (error) {
        data = await batchReconciliation.recoverCommit({
          error,
          baselineBatchIds,
          sourceName,
          total,
          collection,
        });
        await finish({
          data,
          fallbackCount: rows.length,
          total,
          label,
          toastMessage,
          alreadyRefreshed: true,
        });
        return;
      }
      await finish({
        data,
        fallbackCount: rows.length,
        total,
        label,
        toastMessage,
      });
    }

    async function commitAccounts({ rows, sourceName, total }) {
      await commitWithReconciliation({
        operation: () => repository.commitAccounts({ rows, sourceName, total }),
        sourceName,
        total,
        rows,
        label: "account",
        toastMessage: "Import complete",
        collection: "accounts",
      });
    }

    async function commitTransactions({
      kind,
      rows,
      sourceName,
      total,
      label,
    }) {
      await commitWithReconciliation({
        operation: () =>
          repository.commitTransactions({ kind, rows, sourceName, total }),
        sourceName,
        total,
        rows,
        label,
        collection: kind,
      });
    }

    return Object.freeze({ commitAccounts, commitTransactions });
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
