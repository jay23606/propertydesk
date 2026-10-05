/* Address formatting shared by PropertyDesk property workflows. */
(() => {
  "use strict";

  const propertyLocation = (property) =>
    [property.city, property.state, property.postal_code]
      .filter(Boolean)
      .join(", ");
  const propertyAddress = (property) =>
    [property.address, propertyLocation(property)].filter(Boolean).join(", ");
  const streetAddress = (property) =>
    String(property.address || property.name || "")
      .split(",")[0]
      .trim();

  window.PropertyDeskPropertyAddressUtils = Object.freeze({
    propertyLocation,
    propertyAddress,
    streetAddress,
  });
})();
