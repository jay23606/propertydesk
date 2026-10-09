/* Coordinate account and transaction commits with batch recovery. */
(() => {
  "use strict";

  function createImportCommit({
    getWorkspaceOwnerId,
    getImportBatches,
    getAccounts,
    getPayments,
    getExpenses,
    fetchAll,
    status,
    toast,
    repository,
    refreshWorkspace,
    modules,
  }) {
    function createBatchReconciliation(getImportedRows) {
      return modules.batchReconciliation.create({
        getWorkspaceOwnerId,
        getImportBatches,
        getImportedRows,
        fetchAll,
        toast,
        refreshWorkspace,
      });
    }
    const accountBatchReconciliation = createBatchReconciliation(getAccounts);
    const transactionBatchReconciliation = Object.freeze({
      payments: createBatchReconciliation(getPayments),
      expenses: createBatchReconciliation(getExpenses),
    });
    const { finish } = modules.reporting.create({
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
      reconciliation,
    }) {
      const baselineBatchIds = reconciliation.captureBaselineBatchIds(
        sourceName,
        total,
      );
      let data;
      try {
        data = await operation();
      } catch (error) {
        data = await reconciliation.recoverCommit({
          error,
          baselineBatchIds,
          sourceName,
          total,
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
        reconciliation: accountBatchReconciliation,
      });
    }

    async function commitTransactions({
      kind,
      rows,
      sourceName,
      total,
      label,
    }) {
      const reconciliation = transactionBatchReconciliation[kind];
      if (!reconciliation) {
        throw new TypeError("Unsupported transaction import kind");
      }
      await commitWithReconciliation({
        operation: () =>
          repository.commitTransactions({ kind, rows, sourceName, total }),
        sourceName,
        total,
        rows,
        label,
        reconciliation,
      });
    }

    return Object.freeze({ commitAccounts, commitTransactions });
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
