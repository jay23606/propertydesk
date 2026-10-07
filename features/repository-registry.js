/* Share the workspace's data-access adapters with feature workflows. */
(() => {
  "use strict";

  function create({ repositories, getClient }) {
    const resolveClient = () => getClient();

    return Object.freeze({
      accounts: repositories.accounts.create({ getClient: resolveClient }),
      accountHistory: repositories.accountHistory.create({
        getClient: resolveClient,
      }),
      deposits: repositories.deposits.create({ getClient: resolveClient }),
      documents: repositories.documents.create({ getClient: resolveClient }),
      imports: repositories.imports.create({ getClient: resolveClient }),
      properties: repositories.properties.create({ getClient: resolveClient }),
      propertyHolders: repositories.propertyHolders.create({
        getClient: resolveClient,
      }),
      transactions: repositories.transactions.create({
        getClient: resolveClient,
      }),
      workspaceMembers: repositories.workspaceMembers.create({
        getClient: resolveClient,
      }),
    });
  }

  window.PropertyDeskRepositoryRegistry = Object.freeze({ create });
})();
