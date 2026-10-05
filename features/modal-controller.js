/* Shared modal lifecycle and form option rendering. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    propertyAddress,
    prettyType,
    documentRef = document,
  }) {
    function openModal(id) {
      $(id).classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    function resetPaymentModal() {
      $("payment-modal-title").textContent = "Record payment";
      $("payment-modal").querySelector(".eyebrow").textContent =
        "PAYMENT ENTRY";
      $("payment-save-button").textContent = "Save payment";
      $("payment-save-next").classList.remove("hidden");
    }

    function resetExpenseModal() {
      $("expense-modal-title").textContent = "Record expense";
      $("expense-modal").querySelector(".eyebrow").textContent =
        "PROPERTY EXPENSE";
      $("expense-save-button").textContent = "Save expense";
      $("expense-save-next").classList.remove("hidden");
    }

    function closeModal(modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";

      if (modal.id === "import-preview-modal") state.pendingImport = null;
      if (modal.id === "detail-modal") state.auditRequestId++;
      if (modal.id !== "payment-modal" && modal.id !== "expense-modal") return;

      state.pendingCorrection = null;
      if (modal.id === "payment-modal") resetPaymentModal();
      else resetExpenseModal();
    }

    function attachEvents() {
      documentRef.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", () =>
          closeModal(button.closest(".modal")),
        );
      });
      documentRef.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        documentRef.querySelectorAll(".modal:not(.hidden)").forEach(closeModal);
      });
    }

    function fillSelect(id, options, placeholder) {
      const element = $(id);
      const optionHTML = options
        .map(
          (option) =>
            `<option value="${esc(option.value)}">${esc(option.label)}</option>`,
        )
        .join("");
      element.innerHTML = `<option value="">${esc(placeholder)}</option>${optionHTML}`;
    }

    function populateFormOptions() {
      const propertyOptions = state.properties.map((property) => ({
        value: property.id,
        label: `${property.name} — ${propertyAddress(property)}`,
      }));
      const paymentOptions = state.accounts
        .filter((account) => account.status === "active")
        .map((account) => ({
          value: account.id,
          label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
        }));
      const expenseAccountOptions = state.accounts.map((account) => ({
        value: account.id,
        label: `${account.name} — ${prettyType(account.account_type)}`,
      }));

      fillSelect("account-property", propertyOptions, "Choose a property");
      fillSelect("payment-account", paymentOptions, "Choose an account");
      fillSelect("expense-property", propertyOptions, "Choose a property");
      fillSelect("expense-account", expenseAccountOptions, "Property level");
    }

    return {
      attachEvents,
      openModal,
      closeModal,
      fillSelect,
      populateFormOptions,
    };
  }

  window.PropertyDeskModalController = Object.freeze({ create });
})();
