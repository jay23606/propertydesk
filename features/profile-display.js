/* Shared account label and current-date display for the app shell. */
(() => {
  "use strict";

  function greetingForHour(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function displayNameFor(user) {
    return (
      user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there"
    );
  }

  function createProfileDisplay({ $, state, now }) {
    function updateGreeting() {
      const currentTime = now();
      const greeting = greetingForHour(currentTime.getHours());
      const displayName = displayNameFor(state.user);
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
