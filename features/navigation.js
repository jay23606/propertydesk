/* PropertyDesk workspace page navigation. */
(() => {
  "use strict";

  function create({
    $,
    state,
    renderWorkspacePage,
    documentRef = document,
    windowRef = window,
  }) {
    function navigate(view) {
      state.view = view;
      documentRef.querySelectorAll(".page").forEach((page) => {
        page.classList.toggle("active", page.id === "page-" + view);
      });
      documentRef.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.view === view);
      });
      $("page-crumb").textContent =
        view.charAt(0).toUpperCase() + view.slice(1);
      windowRef.scrollTo({ top: 0, behavior: "smooth" });
    }

    function attachEvents() {
      documentRef.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
          if (link.dataset.view === "workspace") renderWorkspacePage();
          navigate(link.dataset.view);
        });
      });
      $("user-menu").addEventListener("click", () => {
        renderWorkspacePage();
        navigate("workspace");
      });
      documentRef.querySelectorAll("[data-goto]").forEach((link) => {
        link.addEventListener("click", () => navigate(link.dataset.goto));
      });
    }

    return Object.freeze({ navigate, attachEvents });
  }

  window.PropertyDeskNavigation = Object.freeze({ create });
})();
