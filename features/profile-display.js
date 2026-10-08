/* Shared account label and current-date display for the app shell. */
(() => {
  "use strict";

  function createProfileDisplay({ $, state, now = () => new Date() }) {
    function updateGreeting() {
      const currentTime = now();
      const hour = currentTime.getHours();
      const greeting =
        hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
      const displayName =
        state.user?.user_metadata?.display_name ||
        state.user?.email?.split("@")[0] ||
        "there";
      $("greeting-name").textContent = `, ${displayName}`;
      $("page-overview").querySelector("h1").firstChild.textContent = greeting;
      $("user-email").textContent = displayName;
      $("avatar-initial").textContent = displayName.charAt(0).toUpperCase();
      $("user-menu").textContent = displayName.charAt(0).toUpperCase();
      $("today-label").textContent = currentTime.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    return Object.freeze({ updateGreeting });
  }

  window.PropertyDeskProfileDisplay = Object.freeze({
    create: createProfileDisplay,
  });
})();
