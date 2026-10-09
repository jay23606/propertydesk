/* Persist and normalize the shared email and SMS reminder templates. */
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

  function createReminderTemplateStore({ toast, storage }) {
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
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
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
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
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

    return Object.freeze({ read, write, getTemplate });
  }

  window.PropertyDeskReminderTemplateStore = Object.freeze({
    create: createReminderTemplateStore,
  });
})();
