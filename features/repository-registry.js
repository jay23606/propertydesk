/* Share the workspace's data-access adapters with feature workflows. */
(() => {
  "use strict";

  function create({ repositories, getClient, queryUtils }) {
    const resolveClient = () => getClient();

    return Object.freeze({
      accounts: repositories.accounts.create({
        getClient: resolveClient,
        queryUtils,
      }),
      accountHistory: repositories.accountHistory.create({
        getClient: resolveClient,
        queryUtils,
      }),
      deposits: repositories.deposits.create({
        getClient: resolveClient,
        queryUtils,
      }),
      documents: repositories.documents.create({
        getClient: resolveClient,
        queryUtils,
      }),
      imports: repositories.imports.create({
        getClient: resolveClient,
        queryUtils,
      }),
      properties: repositories.properties.create({
        getClient: resolveClient,
        queryUtils,
      }),
      propertyHolders: repositories.propertyHolders.create({
        getClient: resolveClient,
        queryUtils,
      }),
      transactions: repositories.transactions.create({
        getClient: resolveClient,
        queryUtils,
      }),
      workspaceMembers: repositories.workspaceMembers.create({
        getClient: resolveClient,
        queryUtils,
      }),
    });
  }

  window.PropertyDeskRepositoryRegistry = Object.freeze({ create });
})();
