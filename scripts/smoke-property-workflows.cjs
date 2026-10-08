const {
  assertNoBrowserErrors,
  assertNoUnhandledRejections,
} = require("./smoke-browser-support.cjs");

async function smokePropertyWorkflows(
  signedInPage,
  signedInPageErrors,
  signedInConsoleErrors,
) {
  console.log("Smoke: checking property, payment, and account details.");
  await signedInPage.locator('.nav-link[data-view="overview"]').click();
  await signedInPage
    .locator('#overview-properties [data-property-card="smoke-property"]')
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#property-detail-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator('#overview-properties [data-property-payment="smoke-property"]')
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#payment-modal button[data-close]")
    .first()
    .click();
  await signedInPage.locator('.nav-link[data-view="properties"]').click();
  await signedInPage.setViewportSize({ width: 390, height: 844 });
  const mobilePortfolio = await signedInPage.evaluate(() => {
    const scroller = document.querySelector(".portfolio-table");
    const firstCell = document.querySelector(
      "#properties-table td:first-child",
    );
    const paymentButton = firstCell?.querySelector("[data-account-payment]");
    if (!scroller || !firstCell || !paymentButton) return null;
    scroller.scrollLeft = 240;
    const viewport = scroller.getBoundingClientRect();
    const button = paymentButton.getBoundingClientRect();
    return {
      hasHorizontalOverflow: scroller.scrollWidth > scroller.clientWidth,
      firstColumnIsSticky: getComputedStyle(firstCell).position === "sticky",
      paymentButtonStaysVisible:
        button.left >= viewport.left && button.right <= viewport.right,
    };
  });
  if (
    !mobilePortfolio?.hasHorizontalOverflow ||
    !mobilePortfolio.firstColumnIsSticky ||
    !mobilePortfolio.paymentButtonStaysVisible
  ) {
    throw new Error(
      "The mobile Properties grid did not keep the Payment button visible while scrolling.",
    );
  }
  await signedInPage.setViewportSize({ width: 1280, height: 720 });
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator("#property-detail-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator("#property-detail-modal.hidden")
    .waitFor({ state: "hidden" });
  await signedInPage
    .locator('#properties-table [data-account-payment="smoke-account"]')
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  if (
    (await signedInPage.locator("#payment-amount").inputValue()) !== "53.68"
  ) {
    throw new Error(
      "The note payment form did not prefill the scheduled installment amount.",
    );
  }
  assertNoBrowserErrors(
    signedInPageErrors,
    signedInConsoleErrors,
    "Payment entry",
  );
  await assertNoUnhandledRejections(signedInPage, "Payment entry");
  await signedInPage
    .locator("#payment-modal button[data-close]")
    .first()
    .click();
  await signedInPage
    .locator("#payment-modal.hidden")
    .waitFor({ state: "hidden" });
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  const propertyDetail = await signedInPage
    .locator("#property-detail-content")
    .innerText();
  if (
    !propertyDetail.includes("Recent activity") ||
    !propertyDetail.includes("October smoke payment") ||
    !propertyDetail.includes("Smoke-test repair")
  ) {
    throw new Error(
      "The signed-in app did not render property activity in the Properties details view.",
    );
  }
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-account"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  const signedInDetail = await signedInPage
    .locator("#detail-content")
    .innerText();
  if (!signedInDetail.includes("Estimated amortization schedule")) {
    throw new Error(
      "The signed-in app did not open the smoke note schedule through the Properties UI.",
    );
  }
  await signedInPage.locator("#detail-modal button[data-close]").click();
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-rental"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  const signedInRentalDetail = await signedInPage
    .locator("#detail-content")
    .innerText();
  if (!signedInRentalDetail.includes("Security deposit ledger")) {
    throw new Error(
      "The signed-in app did not render the rental deposit ledger through the Properties UI.",
    );
  }
  if (
    !signedInRentalDetail.includes("Prior agreement terms") ||
    !signedInRentalDetail.includes("Change history")
  ) {
    throw new Error(
      "The signed-in app did not render account history through the Properties UI.",
    );
  }
  const depositPrompts = ["25.00", "Smoke test retention"];
  const acceptDepositPrompts = (dialog) => {
    void dialog.accept(depositPrompts.shift());
    if (!depositPrompts.length)
      signedInPage.off("dialog", acceptDepositPrompts);
  };
  signedInPage.on("dialog", acceptDepositPrompts);
  await signedInPage
    .locator('#detail-content [data-deposit-adjustment="retained"]')
    .click();
  await signedInPage
    .locator("#detail-deposit-section")
    .getByText("Smoke test retention")
    .waitFor({ state: "visible", timeout: 10000 });
  await signedInPage.locator("#detail-modal button[data-close]").click();
  await signedInPage.locator('.nav-link[data-view="payments"]').click();
}

module.exports = { smokePropertyWorkflows };
