async function smokeTransactionWorkflows(signedInPage) {
  console.log("Smoke: checking transaction correction and reporting.");
  signedInPage.once("dialog", (dialog) =>
    dialog.accept("Smoke-test correction"),
  );
  await signedInPage
    .locator(
      '#payments-table [data-correct-transaction][data-id="smoke-payment"]',
    )
    .click();
  await signedInPage.locator("#payment-modal:not(.hidden)").waitFor();
  if (
    (await signedInPage.locator("#payment-modal-title").innerText()) !==
      "Correct payment" ||
    (await signedInPage.locator("#payment-amount").inputValue()) !== "800"
  ) {
    throw new Error(
      "The Transactions view did not open the selected payment in correction mode.",
    );
  }
  await signedInPage.locator("#payment-save-button").click();
  await signedInPage
    .locator("#payment-modal.hidden")
    .waitFor({ state: "hidden" });
  const correctionSaved = await signedInPage.evaluate(() =>
    window.__smokeRpcCalls.some(
      (call) =>
        call.name === "pd_correct_transaction" &&
        call.args.p_kind === "payment" &&
        call.args.p_transaction_id === "smoke-payment",
    ),
  );
  if (!correctionSaved) {
    throw new Error(
      "Saving the payment correction did not reach transaction maintenance.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="reports"]').click();
  const reportPage = await signedInPage.locator("#page-reports").innerText();
  for (const expected of ["$800.00", "$25.00", "$775.00", "Import history"]) {
    if (!reportPage.includes(expected)) {
      throw new Error(
        `The Reports view did not include the expected value: ${expected}.`,
      );
    }
  }
  await signedInPage.locator('.nav-link[data-view="workspace"]').click();
  const workspacePage = await signedInPage
    .locator("#page-workspace")
    .innerText();
  if (
    !workspacePage.includes("Email reminder activity") ||
    !workspacePage.includes("Reminder attempts will appear here")
  ) {
    throw new Error(
      "Workspace settings did not render reminder delivery activity.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="payments"]').click();
}

async function smokeTransactionMaintenance(signedInPage) {
  console.log("Smoke: checking transaction voiding and account closure.");
  const handleVoidDialogs = (dialog) => {
    if (dialog.type() === "confirm") {
      void dialog.accept();
    } else {
      void dialog.accept("Smoke-test void");
    }
  };
  signedInPage.on("dialog", handleVoidDialogs);
  await signedInPage
    .locator('#payments-table [data-void-transaction][data-id="smoke-expense"]')
    .click();
  await signedInPage
    .getByText("Transaction voided; original entry preserved")
    .waitFor();
  signedInPage.off("dialog", handleVoidDialogs);
  const expenseVoided = await signedInPage.evaluate(
    () =>
      window.__smokeRows.pd_expenses.find((row) => row.id === "smoke-expense")
        ?.status === "voided",
  );
  if (!expenseVoided) {
    throw new Error(
      "Voiding an expense did not reach transaction maintenance.",
    );
  }
  await signedInPage.locator('.nav-link[data-view="properties"]').click();
  await signedInPage
    .locator('#properties-table [data-property-open="smoke-property"]')
    .first()
    .click();
  await signedInPage.locator("#property-detail-modal:not(.hidden)").waitFor();
  await signedInPage
    .locator('#property-detail-content [data-detail="smoke-account"]')
    .click();
  await signedInPage.locator("#detail-modal:not(.hidden)").waitFor();
  signedInPage.once("dialog", (dialog) => dialog.accept());
  await signedInPage
    .locator('[data-account-detail-close="smoke-account"]')
    .click();
  await signedInPage.getByText("Account closed").waitFor();
  const accountClosed = await signedInPage.evaluate(
    () =>
      window.__smokeRows.pd_accounts.find((row) => row.id === "smoke-account")
        ?.status === "closed",
  );
  if (!accountClosed) {
    throw new Error("Closing an account did not reach account maintenance.");
  }
}

module.exports = { smokeTransactionMaintenance, smokeTransactionWorkflows };
