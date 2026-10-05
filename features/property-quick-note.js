/* Property address note editing workflow. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    streetAddress,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
  }) {
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
      let error;
      try {
        ({ error } = await state.client
          .from("pd_properties")
          .update({ notes: note || null })
          .eq("id", id)
          .eq("user_id", state.workspaceOwnerId));
      } catch {
        toast(
          "Property note couldn't be saved right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast(note ? "Property note saved" : "Property note removed");
    }

    return { editPropertyQuickNote };
  }

  window.PropertyDeskPropertyQuickNote = Object.freeze({ create });
})();
