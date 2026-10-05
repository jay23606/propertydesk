/* PropertyDesk portfolio views. */
(() => {
  "use strict";

  function createPropertyViews(context) {
    const {
      $,
      state,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      esc,
      money,
      propertyAddress,
      portfolioTable,
      monthStart,
      streetAddress,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentStatusInMonth,
      openPayment,
      editPropertyQuickNote,
      openPropertyDetails,
      resetAccountForm,
      populateFormOptions,
      openModal,
    } = context;

    function attachEvents() {
      $("property-search").addEventListener("input", renderProperties);
      $("property-filter").addEventListener("change", renderProperties);
      $("property-holder-filter").addEventListener("change", renderProperties);
      $("show-archived").addEventListener("change", renderProperties);
      $("accounts-table").addEventListener("click", (event) => {
        const payment = event.target.closest("[data-account-payment]");
        if (payment) {
          event.preventDefault();
          event.stopPropagation();
          openPayment(payment.dataset.accountPayment);
          return;
        }
        const note = event.target.closest("[data-property-note]");
        if (note) {
          event.preventDefault();
          event.stopPropagation();
          editPropertyQuickNote(note.dataset.propertyNote);
          return;
        }
        const property = event.target.closest("[data-property-open]");
        if (property) {
          openPropertyDetails(property.dataset.propertyOpen);
          return;
        }
        const addAccount = event.target.closest("[data-property-account]");
        if (addAccount) {
          resetAccountForm();
          populateFormOptions();
          $("account-property").value = addAccount.dataset.propertyAccount;
          openModal("account-modal");
        }
      });
    }
    function renderProperties() {
      const holder = $("property-holder-filter"),
        current = holder.value;
      holder.innerHTML =
        '<option value="all">All account holders</option>' +
        state.workspaceMembers
          .map(
            (m) =>
              `<option value="${esc(m.member_user_id)}">${esc(m.display_name || m.email)}</option>`,
          )
          .join("");
      holder.value = state.workspaceMembers.some(
        (m) => m.member_user_id === current,
      )
        ? current
        : "all";
      renderAccounts();
      $("property-nav-count").textContent = state.properties.filter(
        (p) => !p.archived_at,
      ).length;
    }
    function renderAccounts() {
      const q = $("property-search").value.trim().toLowerCase(),
        type = $("property-filter").value,
        holder = $("property-holder-filter").value,
        showArchived = $("show-archived").checked,
        rows = [];
      for (const property of state.properties) {
        const tags = state.propertyHolders
          .filter((x) => x.property_id === property.id)
          .map((x) => x.member_user_id);
        if (property.archived_at && !showArchived) continue;
        if (holder !== "all" && !tags.includes(holder)) continue;
        const allRelated = state.accounts.filter(
            (a) => a.property_id === property.id,
          ),
          related = allRelated.filter(
            (a) => showArchived || (a.status || "active") === "active",
          ),
          matches = related.filter(
            (a) =>
              (type === "all" || a.account_type === type) &&
              (!q ||
                `${property.name} ${propertyAddress(property)} ${property.notes || ""} ${a.name} ${a.party_name || ""}`
                  .toLowerCase()
                  .includes(q)),
          );
        const street = streetAddress(property);
        if (matches.length)
          for (const account of matches) {
            const due = amountDueSince(
              [account],
              state.payments,
              unpaidDueAccrualStart(),
              todayIso(),
            );
            const monthly = monthlyScheduledEstimate([
              { ...account, status: "active" },
            ]);
            const partyName = account.party_name || account.name,
              fullAddress = propertyAddress(property);
            const reminderPeriod = dateOnly(monthStart()).toLocaleDateString(
                undefined,
                { month: "long", year: "numeric" },
              ),
              reminderAsOf = monthEnd();
            const reminderHref = lateReminderMailto({
              email: account.party_email,
              address: fullAddress,
              unpaidDue: money(due),
              senderName:
                state.user?.user_metadata?.display_name?.trim() ||
                "PropertyDesk",
              recipientName: partyName,
              month: reminderPeriod,
              asOf: reminderAsOf,
            });
            const recipientHint = account.party_email
              ? "Draft late reminder email"
              : "No email saved; opens an unaddressed late reminder draft";
            const scheduledThisMonth =
              amountDueSince(
                [{ ...account, status: "active" }],
                [],
                monthStart(),
                monthEnd(),
              ) || Number(account.payment_amount || 0);
            const paymentStatus = paymentStatusInMonth(
              state.payments,
              account.id,
              monthStart(),
              scheduledThisMonth,
            );
            const loanBalance =
              account.account_type === "rental" ? 0 : accountBalance(account);
            rows.push({
              hasAccount: true,
              party: partyName,
              account: account.name,
              address: street,
              id: account.id,
              unpaidDue: due,
              scheduledPayment: monthly,
              loanBalance,
              hasLoanBalance: account.account_type !== "rental",
                html: portfolioTable.accountRowHTML({
                property,
                account,
                street,
                due,
                monthly,
                loanBalance,
                partyName,
                paymentStatus,
                reminderHref,
                recipientHint,
              }),
            });
          }
        else if (
          allRelated.length === 0 &&
          type === "all" &&
          (!q ||
            `${property.name} ${propertyAddress(property)} ${property.notes || ""}`
              .toLowerCase()
              .includes(q))
        ) {
          rows.push({
            hasAccount: false,
            party: "",
            account: "",
            address: street,
            id: property.id,
            html: portfolioTable.emptyPropertyRowHTML(property, street),
          });
        }
      }
      const compare = (a, b) =>
        String(a || "").localeCompare(String(b || ""), undefined, {
          sensitivity: "base",
          numeric: true,
        });
      rows.sort(
        (a, b) =>
          Number(b.hasAccount) - Number(a.hasAccount) ||
          compare(a.party, b.party) ||
          compare(a.account, b.account) ||
          compare(a.address, b.address) ||
          compare(a.id, b.id),
      );
      $("accounts-table").innerHTML = rows.map((row) => row.html).join("");
      const totals = rows.reduce(
        (result, row) => {
          if (!row.hasAccount) return result;
          result.unpaidDue += row.unpaidDue;
          result.scheduledPayment += row.scheduledPayment;
          result.loanBalance += row.loanBalance;
          if (row.hasLoanBalance) result.loanCount++;
          return result;
        },
        { unpaidDue: 0, scheduledPayment: 0, loanBalance: 0, loanCount: 0 },
      );
      $("accounts-totals").innerHTML = portfolioTable.totalsRowHTML(totals);
      $("accounts-totals").classList.toggle(
        "hidden",
        !rows.some((row) => row.hasAccount),
      );
      $("accounts-empty").classList.toggle("hidden", rows.length > 0);
      if (!rows.length)
        $("accounts-empty").textContent =
          "No matching active properties. Use “Show inactive / archived” to include inactive records.";
    }

    return {
      renderProperties,
      attachEvents,
      renderAccounts,
    };
  }

  window.PropertyDeskPropertyViews = Object.freeze({
    create: createPropertyViews,
  });
})();
