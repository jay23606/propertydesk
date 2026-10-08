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
        state,
        fetchAll,
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
      await savePropertyQuickNote(id, state.workspaceOwnerId, note, () =>
        toast(note ? "Property note saved" : "Property note removed"),
      );
    }

    return Object.freeze({ editPropertyQuickNote });
  }

  window.PropertyDeskPropertyQuickNote = Object.freeze({ create });
})();
