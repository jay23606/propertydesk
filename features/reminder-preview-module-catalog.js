/* Collect the model and view workflows for the reminder preview. */
(() => {
  "use strict";

  function createReminderPreviewModuleCatalog() {
    return Object.freeze({
      previewWorkflow: window.PropertyDeskReminderPreviewWorkflow,
      model: window.PropertyDeskReminderPreviewModel,
      preview: window.PropertyDeskReminderPreview,
    });
  }

  window.PropertyDeskReminderPreviewModuleCatalog = Object.freeze({
    create: createReminderPreviewModuleCatalog,
  });
})();
