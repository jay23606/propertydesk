/* PropertyDesk property notes, member labels, and archive workflows. */
(() => {
  "use strict";

  function create({
    $, state, toast, fetchAll, todayIso, streetAddress, openPropertyDetails,
    documentRef = document,
    promptAction = (message, initialValue) => window.prompt(message, initialValue),
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
      const { error } = await state.client.from("pd_properties")
        .update({ notes: note || null })
        .eq("id", id)
        .eq("user_id", state.workspaceOwnerId);
      if (error) {
        toast(error.message);
        return;
      }
      await fetchAll();
      toast(note ? "Property note saved" : "Property note removed");
    }

    async function savePropertyHolders() {
      const id = state.selectedPropertyId;
      const selected = [...documentRef.querySelectorAll("[data-holder-choice]:checked")]
        .map((input) => input.value);
      if (!id) return;
      const { error: deleteError } = await state.client.from("pd_property_holders")
        .delete()
        .eq("user_id", state.workspaceOwnerId)
        .eq("property_id", id);
      if (deleteError) {
        toast(deleteError.message);
        return;
      }
      if (selected.length) {
        const { error } = await state.client.from("pd_property_holders").insert(
          selected.map((member_user_id) => ({
            user_id: state.workspaceOwnerId,
            property_id: id,
            member_user_id,
          })),
        );
        if (error) {
          toast(error.message);
          await fetchAll();
          openPropertyDetails(id);
          return;
        }
      }
      await fetchAll();
      openPropertyDetails(id);
      toast("Account-holder labels saved");
    }

    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;
      const archived_at = property.archived_at ? null : todayIso();
      const { error } = await state.client.from("pd_properties")
        .update({ archived_at })
        .eq("id", id)
        .eq("user_id", state.workspaceOwnerId);
      if (error) {
        toast(error.message);
        return;
      }
      await fetchAll();
      openPropertyDetails(id);
      toast(archived_at ? "Property archived" : "Property restored");
    }

    return { editPropertyQuickNote, savePropertyHolders, toggleArchiveProperty };
  }

  window.PropertyDeskPropertyManagement = { create };
})();
