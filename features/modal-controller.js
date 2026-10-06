/* Shared modal lifecycle and workflow-state cleanup. */
(() => {
  "use strict";

  function create({ $, state, documentRef = document }) {
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

    return { attachEvents, openModal, closeModal };
  }

  window.PropertyDeskModalController = Object.freeze({ create });
})();
