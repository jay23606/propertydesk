/* Build scoped Supabase reads and collect paginated record sets. */
(() => {
  "use strict";

  function runWorkspaceRead(client, workspaceId, read) {
    if (read.rpc) return client.rpc(read.rpc);
    let query = client.from(read.table).select("*").eq("user_id", workspaceId);
    for (const [column, ascending] of read.order || [])
      query = query.order(column, { ascending });
    if (read.limit) query = query.limit(read.limit);
    return query;
  }

  async function loadAllPages(client, table, pageSize = 500) {
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from(table)
        .select("*")
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  }

  window.PropertyDeskWorkspaceQuery = Object.freeze({
    runWorkspaceRead,
    loadAllPages,
  });
})();
