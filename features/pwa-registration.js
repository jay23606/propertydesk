/* Register the offline app shell when PropertyDesk runs in a web context. */
(() => {
  'use strict';

  function registerShell({ navigatorRef = navigator, windowRef = window, logger = console } = {}) {
    if (
      !('serviceWorker' in navigatorRef) ||
      !windowRef.location.protocol.startsWith('http')
    ) {
      return;
    }

    navigatorRef.serviceWorker
      .register('./sw.js')
      .catch((error) =>
        logger.warn('PropertyDesk shell cache could not be registered:', error),
      );
  }

  window.PropertyDeskPwa = Object.freeze({ registerShell });
})();
