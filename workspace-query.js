/* Build scoped Supabase reads and collect paginated record sets. */
(() => {
  "use strict";

  function create({ getClient }) {
    function client() {
      const resolved = getClient();
      if (!resolved)
        throw new Error("Workspace data is unavailable until sign-in.");
      return resolved;
    }

    function runWorkspaceRead(workspaceId, read) {
      const currentClient = client();
      if (read.rpc) return currentClient.rpc(read.rpc);
      let query = currentClient
        .from(read.table)
        .select("*")
        .eq("user_id", workspaceId);
      for (const [column, ascending] of read.order || [])
        query = query.order(column, { ascending });
      if (read.limit) query = query.limit(read.limit);
      return query;
    }

    function loadWorkspaceId() {
      return client().rpc("pd_workspace_id");
    }

    async function loadAllPages(table, pageSize = 500) {
      if (!Number.isSafeInteger(pageSize) || pageSize < 1)
        throw new RangeError("Page size must be a positive integer.");
      const currentClient = client();
      const rows = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await currentClient
          .from(table)
          .select("*")
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
      }
    }

    return Object.freeze({ runWorkspaceRead, loadWorkspaceId, loadAllPages });
  }

  window.PropertyDeskWorkspaceQuery = Object.freeze({ create });
})();
