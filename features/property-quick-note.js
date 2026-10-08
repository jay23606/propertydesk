/* Property address note editing workflow. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    streetAddress,
    repository,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
  }) {
    const { savePropertyQuickNote } =
      window.PropertyDeskPropertyMaintenance.create({
        toast,
        repository,
      });

    async function editPropertyQuickNote(id) {
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;
      const entered = promptAction(
        `Quick note shown under ${streetAddress(property)} (140 characters max):`,
        property.notes || "",
      );
      if (entered === null) return;
      const note = entered.replace(/\s+/g, " ").trim();
      if (note.length > 140) {
        toast("Quick notes are limited to 140 characters.");
        return;
      }
      let reconciled = false;
      const saved = await savePropertyQuickNote(
        id,
        state.workspaceOwnerId,
        note,
        async () => {
          reconciled = await refreshUncertainPropertyNote(id, note);
          return reconciled;
        },
      );
      if (!saved || reconciled) return;
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: note ? "Property note saved" : "Property note removed",
        refreshFailureMessage: note
          ? "Property note was saved, but the workspace could not refresh. Reload to verify it."
          : "Property note was removed, but the workspace could not refresh. Reload to verify it.",
      });
    }

    async function refreshUncertainPropertyNote(id, note) {
      let noteMatches = false;
      const refreshed =
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          afterRefresh: () => {
            const property = state.properties.find((item) => item.id === id);
            noteMatches = (property?.notes || "") === note;
          },
          toast,
          refreshFailureMessage:
            "Property note result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
        });
      if (!refreshed) return false;
      toast(
        noteMatches
          ? note
            ? "Property note saved"
            : "Property note removed"
          : "Property note result is shown in refreshed Properties. Check it before retrying.",
      );
      return noteMatches;
    }

    return Object.freeze({ editPropertyQuickNote });
  }

  window.PropertyDeskPropertyQuickNote = Object.freeze({ create });
})();
