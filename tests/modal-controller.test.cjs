const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createController() {
  const elements = new Map();
  const listeners = new Map();
  const document = {
    body: { style: { overflow: "" } },
    addEventListener: (name, handler) => listeners.set(name, handler),
    querySelectorAll: (selector) =>
      selector === "[data-close]"
        ? [closeButton]
        : [elements.get("payment-modal")].filter(Boolean),
  };
  const closeButton = {
    addEventListener: (name, handler) =>
      listeners.set(`close:${name}`, handler),
    closest: () => elements.get("payment-modal"),
  };
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: "",
        textContent: "",
        innerHTML: "",
        classList: {
          add(value) {
            this.lastAdded = value;
          },
          remove(value) {
            this.lastRemoved = value;
          },
        },
        querySelector: () => getElement(`${id}-eyebrow`),
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {}, document });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "domain-options.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-options.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "modal-controller.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "form-options.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    properties: [{ id: "p1", name: "<Oak>", address: "1 Oak St" }],
    accounts: [
      {
        id: "a1",
        name: "Lease",
        party_name: "<Tenant>",
        account_type: "rental",
        status: "active",
      },
      { id: "a2", name: "Old lease", account_type: "rental", status: "closed" },
    ],
    pendingImport: { id: "batch-1" },
    pendingCorrection: { id: "payment-1" },
    auditRequestId: 4,
  };
  const controller = context.window.PropertyDeskModalController.create({
    $: getElement,
    state,
  });
  const formOptions = context.window.PropertyDeskFormOptions.create({
    $: getElement,
    getProperties: () => state.properties,
    getAccounts: () => state.accounts,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    propertyAddress: (property) => property.address,
    prettyType: (type) => type,
    modules: {
      domainOptions: context.window.PropertyDeskDomainOptions,
      transactionOptions: context.window.PropertyDeskTransactionOptions,
    },
  });
  return {
    controller,
    document,
    elements,
    formOptions,
    getElement,
    listeners,
    state,
  };
}

test("modal controller clears workflow state and resets payment forms when closing", () => {
  const { controller, document, getElement, state } = createController();
  const paymentModal = getElement("payment-modal");
  controller.openModal("payment-modal");
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(paymentModal.classList.lastRemoved, "hidden");

  getElement("payment-modal-title").textContent = "Correct payment";
  getElement("payment-save-button").textContent = "Save correction";
  controller.closeModal(paymentModal);

  assert.equal(document.body.style.overflow, "");
  assert.equal(paymentModal.classList.lastAdded, "hidden");
  assert.equal(state.pendingCorrection, null);
  assert.equal(getElement("payment-modal-title").textContent, "Record payment");
  assert.equal(
    getElement("payment-modal-eyebrow").textContent,
    "PAYMENT ENTRY",
  );
  assert.equal(getElement("payment-save-button").textContent, "Save payment");
  assert.equal(getElement("payment-save-next").classList.lastRemoved, "hidden");
});

test("modal controller cleans up import and detail state", () => {
  const { controller, document, getElement, state } = createController();
  controller.closeModal(getElement("import-preview-modal"));
  controller.closeModal(getElement("detail-modal"));
  assert.equal(state.pendingImport, null);
  assert.equal(state.auditRequestId, 5);
  assert.equal(document.body.style.overflow, "");
});

test("form options escape labels and limit payment accounts to active rows", () => {
  const { formOptions, getElement } = createController();
  formOptions.populateFormOptions();
  assert.match(getElement("account-property").innerHTML, /&lt;Oak&gt;/);
  assert.match(getElement("payment-account").innerHTML, /&lt;Tenant&gt;/);
  assert.doesNotMatch(getElement("payment-account").innerHTML, /Old lease/);
  assert.match(getElement("expense-account").innerHTML, /Old lease/);
});

test("modal controller closes the active dialog on Escape", () => {
  const { controller, document, getElement, listeners, state } =
    createController();
  const paymentModal = getElement("payment-modal");
  controller.openModal("payment-modal");
  controller.attachEvents();

  listeners.get("keydown")({ key: "Enter" });
  assert.equal(paymentModal.classList.lastAdded, undefined);
  listeners.get("keydown")({ key: "Escape" });

  assert.equal(paymentModal.classList.lastAdded, "hidden");
  assert.equal(document.body.style.overflow, "");
  assert.equal(state.pendingCorrection, null);
});

test("modal controller wires close buttons to modal cleanup", () => {
  const { controller, document, getElement, listeners, state } =
    createController();
  const paymentModal = getElement("payment-modal");
  controller.openModal("payment-modal");
  state.pendingCorrection = { id: "payment-1" };
  controller.attachEvents();

  listeners.get("close:click")();

  assert.equal(paymentModal.classList.lastAdded, "hidden");
  assert.equal(document.body.style.overflow, "");
  assert.equal(state.pendingCorrection, null);
  assert.equal(getElement("payment-modal-title").textContent, "Record payment");
});

test("modal controller is loaded before app startup and precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.ok(
    html.indexOf("features/modal-controller.js") < html.indexOf("app.js"),
  );
  assert.ok(html.indexOf("features/form-options.js") < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/modal-controller\.js'/);
  assert.match(worker, /'\.\/features\/form-options\.js'/);
  assert.match(app, /PropertyDeskModalController\.create/);
  assert.match(app, /PropertyDeskFormOptions\.create/);
});
