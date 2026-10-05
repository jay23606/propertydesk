/* Workspace-scoped reads used to hydrate the PropertyDesk client state. */
(() => {
  'use strict';

  function create() {
    async function loadWorkspaceRecords(client, workspaceId) {
      const requests = [
        [
          'properties',
          () =>
            client
              .from('pd_properties')
              .select('*')
              .eq('user_id', workspaceId)
              .order('created_at', { ascending: false }),
        ],
        [
          'accounts',
          () =>
            client
              .from('pd_accounts')
              .select('*')
              .eq('user_id', workspaceId)
              .order('created_at', { ascending: false }),
        ],
        [
          'payments',
          () =>
            client
              .from('pd_payments')
              .select('*')
              .eq('user_id', workspaceId)
              .order('received_date', { ascending: false })
              .order('recorded_at', { ascending: false }),
        ],
        [
          'expenses',
          () =>
            client
              .from('pd_expenses')
              .select('*')
              .eq('user_id', workspaceId)
              .order('expense_date', { ascending: false })
              .order('recorded_at', { ascending: false }),
        ],
        [
          'importBatches',
          () =>
            client
              .from('pd_import_batches')
              .select('*')
              .eq('user_id', workspaceId)
              .order('created_at', { ascending: false }),
        ],
        [
          'documents',
          () =>
            client
              .from('pd_documents')
              .select('*')
              .eq('user_id', workspaceId)
              .order('created_at', { ascending: false }),
        ],
        [
          'agreementVersions',
          () =>
            client
              .from('pd_agreement_versions')
              .select('*')
              .eq('user_id', workspaceId)
              .order('replaced_on', { ascending: false }),
        ],
        [
          'propertyHolders',
          () =>
            client
              .from('pd_property_holders')
              .select('*')
              .eq('user_id', workspaceId),
        ],
        ['workspaceMembers', () => client.rpc('pd_list_workspace_members')],
        [
          'depositEntries',
          () =>
            client
              .from('pd_deposit_entries')
              .select('*')
              .eq('user_id', workspaceId)
              .order('movement_date', { ascending: false })
              .order('created_at', { ascending: false }),
        ],
        [
          'reminderLogs',
          () =>
            client
              .from('pd_reminder_logs')
              .select('*')
              .eq('user_id', workspaceId)
              .order('attempted_at', { ascending: false })
              .limit(300),
        ],
      ];

      const results = await Promise.all(requests.map(([, run]) => run()));
      const failedResult = results.find((result) => result.error);
      if (failedResult) {
        throw failedResult.error;
      }

      return Object.fromEntries(
        requests.map(([key], index) => [key, results[index].data || []]),
      );
    }

    return { loadWorkspaceRecords };
  }

  window.PropertyDeskWorkspaceData = Object.freeze({ create });
})();
