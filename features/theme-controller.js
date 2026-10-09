/* Store and apply the app-wide light and dark theme preference. */
(() => {
  "use strict";

  function create({ documentRef = document, storage } = {}) {
    function setTheme(theme, persist = false) {
      const next = theme === "light" ? "light" : "dark";
      documentRef.documentElement.dataset.theme = next;
      const themeColor = next === "dark" ? "#151b17" : "#f6f7f4";
      documentRef
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", themeColor);
      if (persist) {
        try {
          storage.setItem("propertydesk-theme", next);
        } catch {
          // Keep the active theme for this page when storage is unavailable.
        }
      }

      documentRef.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        const action = next === "dark" ? "light" : "dark";
        button.setAttribute("aria-label", `Switch to ${action} mode`);
        button.setAttribute("aria-pressed", String(next === "dark"));
        const label = button.querySelector(".theme-label");
        if (label) {
          label.textContent = `${action[0].toUpperCase()}${action.slice(1)} mode`;
        }
        const icon = button.querySelector(".theme-icon");
        if (icon) icon.textContent = next === "dark" ? "☼" : "☾";
      });
    }

    function syncThemeButtons() {
      setTheme(documentRef.documentElement.dataset.theme);
    }

    function attachEvents() {
      documentRef.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.addEventListener("click", () =>
          setTheme(
            documentRef.documentElement.dataset.theme === "dark"
              ? "light"
              : "dark",
            true,
          ),
        );
      });
      syncThemeButtons();
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskTheme = Object.freeze({ create });
})();
