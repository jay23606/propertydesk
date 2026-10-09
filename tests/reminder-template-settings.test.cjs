const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function setup() {
  const values = new Map();
  const handlers = new Map();
  const elements = new Map();
  const opened = [];
  const messages = [];
  for (const id of [
    "reminder-template-select",
    "reminder-template-name",
    "reminder-template-subject",
    "reminder-template-body",
    "reminder-template-subject-row",
    "reminder-template-title",
    "reminder-template-delete",
    "reminder-template-add",
    "reminder-template-save",
  ]) {
    elements.set(id, {
      value: "",
      innerHTML: "",
      textContent: "",
      disabled: false,
      classList: {
        values: new Map(),
        toggle(name, force) {
          this.values.set(name, force);
        },
      },
      addEventListener(event, callback) {
        handlers.set(`${id}:${event}`, callback);
      },
    });
  }
  const context = vm.createContext({
    window: {
      localStorage: {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features/reminder-template-store.js"),
      "utf8",
    ),
    context,
  );
  const store = context.window.PropertyDeskReminderTemplateStore.create({
    toast: (message) => messages.push(message),
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features/reminder-template-settings.js"),
      "utf8",
    ),
    context,
  );
  const feature = context.window.PropertyDeskReminderTemplateSettings.create({
    $: (id) => elements.get(id),
    openModal: (id) => opened.push(id),
    toast: (message) => messages.push(message),
    store,
    onChange() {},
  });
  return { feature, values, handlers, elements, opened, messages };
}

test("reminder template editor stores one active template per channel", () => {
  const { feature, handlers, elements, opened } = setup();
  const defaultEmail = feature.getTemplate("email");
  assert.equal(defaultEmail.id, "default-email");
  assert.match(defaultEmail.body, /\{amount\}/);

  feature.openEditor("email");
  feature.attachEvents();
  assert.deepEqual(opened, ["reminder-template-modal"]);
  assert.equal(
    elements.get("reminder-template-title").textContent,
    "Email templates",
  );

  handlers.get("reminder-template-add:click")();
  elements.get("reminder-template-name").value = "Friendly reminder";
  elements.get("reminder-template-subject").value =
    "Checking in about {address}";
  elements.get("reminder-template-body").value = "Hi {name}, {amount} is due.";
  handlers.get("reminder-template-save:click")();

  assert.equal(feature.getTemplate("email").name, "Friendly reminder");
  assert.equal(
    feature.getTemplate("email").subject,
    "Checking in about {address}",
  );
  feature.openEditor("sms");
  assert.equal(
    elements.get("reminder-template-title").textContent,
    "SMS templates",
  );
  assert.equal(
    elements
      .get("reminder-template-subject-row")
      .classList.values.get("hidden"),
    true,
  );
  assert.equal(feature.getTemplate("sms").id, "default-sms");
});
