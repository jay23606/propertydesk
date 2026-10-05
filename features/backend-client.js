/* Validate public Supabase configuration and construct the browser client. */
(() => {
  "use strict";

  function createBackendClient({ config = {}, supabase = window.supabase } = {}) {
    const configured = Boolean(
      config.supabaseUrl && config.supabaseAnonKey && supabase,
    );

    function createClient() {
      if (!configured) return null;
      return supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      );
    }

    return { configured, createClient };
  }

  window.PropertyDeskBackendClient = Object.freeze({
    create: createBackendClient,
  });
})();
