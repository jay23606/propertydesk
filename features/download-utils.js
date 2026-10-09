/* Download browser-generated files and release their temporary URLs. */
(() => {
  "use strict";

  function downloadBlob(blob, filename, { documentRef, urlRef, defer }) {
    const url = urlRef.createObjectURL(blob);
    const link = documentRef.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    defer(() => urlRef.revokeObjectURL(url), 1000);
  }

  window.PropertyDeskDownloadUtils = Object.freeze({ downloadBlob });
})();
