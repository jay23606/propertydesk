/* Share the workspace's data-access adapters with feature workflows. */
(() => {
  "use strict";

  function create({ repositories, getClient }) {
    const resolveClient = () => getClient();

    return Object.freeze({
      accounts: repositories.accounts,
      accountHistory: repositories.accountHistory,
      deposits: repositories.deposits,
      documents: repositories.documents.create(resolveClient),
      imports: repositories.imports.create({ getClient: resolveClient }),
      properties: repositories.properties,
      propertyHolders: repositories.propertyHolders.create({
        getClient: resolveClient,
      }),
      transactions: repositories.transactions,
      workspaceMembers: repositories.workspaceMembers.create({
        getClient: resolveClient,
      }),
    });
  }

  window.PropertyDeskRepositoryRegistry = Object.freeze({ create });
})();
