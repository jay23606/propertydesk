/* Read the workspace tables included in a private backup. */
(() => {
  "use strict";

  function create({ tables, loadAllPages }) {
    async function load(client) {
      const values = await Promise.all(
        tables.map((table) => loadAllPages(client, table)),
      );
      return Object.fromEntries(
        tables.map((table, index) => [table, values[index]]),
      );
    }

    return { tables, load };
  }

  window.PropertyDeskBackupRecords = Object.freeze({ create });
})();
