/* Read the workspace tables included in a private backup. */
(() => {
  "use strict";

  const { tables } = window.PropertyDeskBackupUtils;
  const { loadAllPages } = window.PropertyDeskWorkspaceQuery;

  async function loadBackupRecords(client) {
    const values = await Promise.all(
      tables.map((table) => loadAllPages(client, table)),
    );
    return Object.fromEntries(
      tables.map((table, index) => [table, values[index]]),
    );
  }

  window.PropertyDeskBackupRecords = Object.freeze({
    tables,
    load: loadBackupRecords,
  });
})();
