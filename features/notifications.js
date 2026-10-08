/* Transient, accessible feedback messages for PropertyDesk. */
(() => {
  "use strict";

  function create({
    $,
    delayMs = 2800,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
  }) {
    let timer = null;

    function toast(message) {
      const element = $("toast");
      element.textContent = message;
      element.classList.add("show");
      clearTimeoutFn(timer);
      timer = setTimeoutFn(() => element.classList.remove("show"), delayMs);
    }

    return Object.freeze({ toast });
  }

  window.PropertyDeskNotifications = Object.freeze({ create });
})();
