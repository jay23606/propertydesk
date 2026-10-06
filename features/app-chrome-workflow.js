/* Connect app-wide theme behavior with the workspace navigation shell. */
(() => {
  "use strict";

  function create(context) {
    const theme = window.PropertyDeskTheme.create();
    const shell = window.PropertyDeskAppShellWorkflow.create(context);

    return {
      updateGreeting: shell.updateGreeting,
      navigate: shell.navigate,
      attachThemeEvents: theme.attachEvents,
      attachAppShellEvents: shell.attachEvents,
    };
  }

  window.PropertyDeskAppChromeWorkflow = Object.freeze({ create });
})();
