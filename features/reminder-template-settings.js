/* Store and edit shared reminder templates for every Properties row. */
(() => {
  "use strict";

  const STORAGE_KEY = "propertydesk.reminder-templates.v1";
  const DEFAULT_TEMPLATES = Object.freeze({
    email: {
      id: "default-email",
      name: "Late payment reminder",
      subject: "Payment reminder for {address} · {month}",
      body: "Hi {name},\n\nOur records show {amount} unpaid for {address} (tracked since October 2026; earlier balances or late fees may not be included).\n\nPlease arrange payment promptly or contact me with questions.\n\nThanks!\n{sender}",
    },
    sms: {
      id: "default-sms",
      name: "Late payment text",
      subject: "",
      body: "Hi {name},\n\nOur records show {amount} unpaid for {address} (tracked since October 2026; earlier balances or late fees may not be included).\n\nPlease arrange payment promptly or contact me with questions.\n\nThanks!\n{sender}",
    },
  });

  function createReminderTemplateSettings({ $, openModal, toast, onChange }) {
    let channel = "email";

    function defaults() {
      return Object.fromEntries(
        Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => [
          key,
          { activeId: template.id, items: [{ ...template }] },
        ]),
      );
    }

    function read() {
      try {
        const parsed = JSON.parse(
          window.localStorage.getItem(STORAGE_KEY) || "null",
        );
        const result = defaults();
        for (const key of ["email", "sms"]) {
          const saved = parsed?.[key];
          if (!Array.isArray(saved?.items) || !saved.items.length) continue;
          const items = saved.items.filter(
            (item) => item && typeof item.id === "string" && item.name,
          );
          if (!items.length) continue;
          result[key] = {
            items,
            activeId: items.some((item) => item.id === saved.activeId)
              ? saved.activeId
              : items[0].id,
          };
        }
        return result;
      } catch {
        return defaults();
      }
    }

    function write(data) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch {
        toast("Template settings could not be saved in this browser.", "error");
        return false;
      }
    }

    function getTemplate(kind) {
      const settings = read()[kind];
      return (
        settings.items.find((item) => item.id === settings.activeId) ||
        settings.items[0]
      );
    }

    function selectedTemplate() {
      const settings = read()[channel];
      return settings.items.find((item) => item.id === settings.activeId);
    }

    function renderTemplateEditor() {
      const settings = read()[channel];
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
        const data = read();
        data[channel].activeId = $("reminder-template-select").value;
        if (write(data)) {
          renderTemplateEditor();
          onChange();
        }
      });
      $("reminder-template-add").addEventListener("click", () => {
        const data = read();
        const source = selectedTemplate();
        const id = `${channel}-${Date.now()}`;
        const template = {
          ...source,
          id,
          name: `New ${channel.toUpperCase()} template`,
        };
        data[channel].items.push(template);
        data[channel].activeId = id;
        if (write(data)) renderTemplateEditor();
      });
      $("reminder-template-save").addEventListener("click", () => {
        const data = read();
        const template = data[channel].items.find(
          (item) => item.id === data[channel].activeId,
        );
        template.name = $("reminder-template-name").value.trim() || "Reminder";
        template.subject = $("reminder-template-subject").value;
        template.body = $("reminder-template-body").value;
        if (write(data)) {
          renderTemplateEditor();
          onChange();
          toast("Reminder template saved.");
        }
      });
      $("reminder-template-delete").addEventListener("click", () => {
        const data = read();
        const current = data[channel].items.find(
          (item) => item.id === data[channel].activeId,
        );
        if (!current || current.id.startsWith("default-")) return;
        data[channel].items = data[channel].items.filter(
          (item) => item.id !== current.id,
        );
        data[channel].activeId = data[channel].items[0].id;
        if (write(data)) {
          renderTemplateEditor();
          onChange();
        }
      });
    }

    return Object.freeze({ getTemplate, openEditor, attachEvents });
  }

  window.PropertyDeskReminderTemplateSettings = Object.freeze({
    create: createReminderTemplateSettings,
  });
})();
