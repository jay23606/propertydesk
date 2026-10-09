/* Store and edit shared reminder templates for every Properties row. */
(() => {
  "use strict";

  function createReminderTemplateSettings({
    $,
    openModal,
    toast,
    onChange,
    store,
  }) {
    let channel = "email";

    function selectedTemplate() {
      const settings = store.read()[channel];
      return settings.items.find((item) => item.id === settings.activeId);
    }

    function renderTemplateEditor() {
      const settings = store.read()[channel];
      const select = $("reminder-template-select");
      select.innerHTML = settings.items
        .map(
          (item) =>
            `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`,
        )
        .join("");
      select.value = settings.activeId;
      const template = selectedTemplate();
      $("reminder-template-name").value = template.name;
      $("reminder-template-subject").value = template.subject || "";
      $("reminder-template-body").value = template.body || "";
      $("reminder-template-subject-row").classList.toggle(
        "hidden",
        channel === "sms",
      );
      $("reminder-template-title").textContent =
        channel === "email" ? "Email templates" : "SMS templates";
      $("reminder-template-delete").disabled =
        template.id.startsWith("default-");
      $("reminder-template-delete").classList.toggle(
        "hidden",
        template.id.startsWith("default-"),
      );
    }

    function escapeHTML(value) {
      return String(value).replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      );
    }

    function openEditor(kind) {
      channel = kind === "sms" ? "sms" : "email";
      renderTemplateEditor();
      openModal("reminder-template-modal");
    }

    function attachEvents() {
      $("reminder-template-select").addEventListener("change", () => {
        const data = store.read();
        data[channel].activeId = $("reminder-template-select").value;
        if (store.write(data)) {
          renderTemplateEditor();
          onChange();
        }
      });
      $("reminder-template-add").addEventListener("click", () => {
        const data = store.read();
        const source = selectedTemplate();
        const id = `${channel}-${Date.now()}`;
        const template = {
          ...source,
          id,
          name: `New ${channel.toUpperCase()} template`,
        };
        data[channel].items.push(template);
        data[channel].activeId = id;
        if (store.write(data)) renderTemplateEditor();
      });
      $("reminder-template-save").addEventListener("click", () => {
        const data = store.read();
        const template = data[channel].items.find(
          (item) => item.id === data[channel].activeId,
        );
        template.name = $("reminder-template-name").value.trim() || "Reminder";
        template.subject = $("reminder-template-subject").value;
        template.body = $("reminder-template-body").value;
        if (store.write(data)) {
          renderTemplateEditor();
          onChange();
          toast("Reminder template saved.");
        }
      });
      $("reminder-template-delete").addEventListener("click", () => {
        const data = store.read();
        const current = data[channel].items.find(
          (item) => item.id === data[channel].activeId,
        );
        if (!current || current.id.startsWith("default-")) return;
        data[channel].items = data[channel].items.filter(
          (item) => item.id !== current.id,
        );
        data[channel].activeId = data[channel].items[0].id;
        if (store.write(data)) {
          renderTemplateEditor();
          onChange();
        }
      });
    }

    return Object.freeze({
      getTemplate: store.getTemplate,
      openEditor,
      attachEvents,
    });
  }

  window.PropertyDeskReminderTemplateSettings = Object.freeze({
    create: createReminderTemplateSettings,
  });
})();
