/* Wrap native browser APIs for explicit dependency injection at the app root. */
(() => {
  "use strict";

  function createAppBrowserAdapters({ windowRef, documentRef, downloadUtils }) {
    return Object.freeze({
      $: (id) => documentRef.getElementById(id),
      confirmAction: (message) => windowRef.confirm(message),
      promptAction: (message, initialValue) =>
        windowRef.prompt(message, initialValue),
      openWindow: (...args) => windowRef.open(...args),
      makeId: () => windowRef.crypto.randomUUID(),
      browserStorage: Object.freeze({
        getItem: (key) => windowRef.localStorage.getItem(key),
        setItem: (key, value) => windowRef.localStorage.setItem(key, value),
      }),
      downloadBlob: (blob, filename) =>
        downloadUtils.downloadBlob(blob, filename, {
          documentRef,
          urlRef: windowRef.URL,
          defer: windowRef.setTimeout.bind(windowRef),
        }),
      reportError: (message, error) => windowRef.console?.error(message, error),
    });
  }

  window.PropertyDeskAppBrowserAdapters = Object.freeze({
    create: createAppBrowserAdapters,
  });
})();
