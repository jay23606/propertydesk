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
      prettyKind,
      money,
      propertyAddress,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
      prettyType,
      fmtDate,
      streetAddress,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentFrequencyLabel,
      paymentStatusInMonth,
    } = context;

    function updateGreeting() {
      const hour = new Date().getHours();
      const greeting =
        hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
      const displayName =
        state.user?.user_metadata?.display_name ||
        state.user?.email?.split("@")[0] ||
        "there";
      $("greeting-name").textContent = `, ${displayName}`;
      $("page-overview").querySelector("h1").firstChild.textContent =
        `${greeting}`;
      $("user-email").textContent = displayName;
      $("avatar-initial").textContent = displayName.charAt(0).toUpperCase();
      $("user-menu").textContent = displayName.charAt(0).toUpperCase();
      $("today-label").textContent = new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
    function attachEvents() {
      $("property-search").addEventListener("input", renderProperties);
      $("property-filter").addEventListener("change", renderProperties);
      $("property-holder-filter").addEventListener("change", renderProperties);
      $("show-archived").addEventListener("change", renderProperties);
    }
    function propertyCard(property, compact = false) {
      const related = state.accounts.filter(
        (a) => a.property_id === property.id,
      );
      const active = related.filter((a) => (a.status || "active") === "active");
      const scheduledMonthly = monthlyScheduledEstimate(active);
      const hasNonMonthly = active.some(
        (a) => a.payment_frequency !== "monthly",
      );
      const balance = active
        .filter((a) => a.account_type !== "rental")
        .reduce((sum, a) => sum + accountBalance(a), 0);
      const amountDue = active.reduce(
        (sum, account) =>
          sum +
          amountDueSince(
            [account],
            state.payments,
            unpaidDueAccrualStart(account),
            todayIso(),
          ),
        0,
      );
      const parties = [
        ...new Set(active.map((a) => a.party_name).filter(Boolean)),
      ].join(", ");
      return `<article class="property-card" data-property-card="${esc(property.id)}">
        <div class="property-art">
        <span class="property-type">${esc(prettyKind(property.property_kind))}</span>
        <span class="property-building">
        </span>
        </div>
        <div class="property-info">
        <h3>${esc(property.name)}</h3>
        <div class="property-address">${esc(propertyAddress(property))}</div>${parties ? `<div class="property-party">${esc(parties)}</div>` : ""}<div class="property-summary-grid">
        <div>
        <small>Monthly payment</small>
        <strong>${hasNonMonthly ? "≈ " : ""}${money(scheduledMonthly)}</strong>
        </div>
        <div>
        <small>Loan balance</small>
        <strong>${balance ? money(balance) : active.some((a) => a.account_type !== "rental") ? "$0.00" : "—"}</strong>
        </div>
        <div>
        <small>Balance due · carries forward</small>
        <strong>${money(amountDue)}</strong>
        </div>
        <button class="button primary compact property-quick-payment" type="button" data-property-payment="${esc(property.id)}">＋ Record payment</button>
        </div>
        </div>
        </article>`;
    }
    function renderOverview() {
      $("stat-properties").textContent = state.properties.filter(
        (p) => !p.archived_at,
      ).length;
      $("stat-accounts").textContent = state.accounts.filter(
        (a) =>
          (a.status || "active") === "active" &&
          !state.properties.find((p) => p.id === a.property_id)?.archived_at,
      ).length;
      $("stat-collected").textContent = money(collectedSince(monthStart()));
      $("stat-expected").textContent = money(scheduledMonthlyRunRate());
      const postedThisMonth = state.payments.filter(
        (p) => isPosted(p) && String(p.received_date) >= monthStart(),
      );
      $("stat-collected-foot").textContent =
        `${postedThisMonth.length} payment${postedThisMonth.length === 1 ? "" : "s"} recorded`;
      const upcoming = state.accounts
        .filter((a) => a.status === "active" && a.next_due_date)
        .sort((a, b) =>
          String(a.next_due_date).localeCompare(String(b.next_due_date)),
        )
        .slice(0, 4);
      $("upcoming-list").innerHTML = upcoming.length
        ? upcoming
            .map((a) => {
              const p = state.properties.find((x) => x.id === a.property_id);
              return `<div class="list-row">
        <span class="round-icon">${a.account_type === "rental" ? "⌂" : "▤"}</span>
        <div class="row-copy">
        <strong>${esc(a.party_name || a.name)}</strong>
        <small>${esc(p?.name || "Property")} · ${esc(prettyType(a.account_type))}</small>
        </div>
        <div class="row-right">
        <strong>${money(a.payment_amount)}</strong>
        <small>Due ${fmtDate(a.next_due_date, { month: "short", day: "numeric" })}</small>
        </div>
        </div>`;
            })
            .join("")
        : '<div class="list-empty">No upcoming payments yet. Add an account to get started.</div>';
      const recent = state.payments.filter(isPosted).slice(0, 4);
      $("activity-list").innerHTML = recent.length
        ? recent
            .map((p) => {
              const a = state.accounts.find((x) => x.id === p.account_id),
                prop = state.properties.find((x) => x.id === a?.property_id);
              return `<div class="list-row">
        <span class="round-icon">↙</span>
        <div class="row-copy">
        <strong>${esc(a?.party_name || a?.name || "Payment")}</strong>
        <small>${esc(prop?.name || "Property")} · ${fmtDate(p.received_date, { month: "short", day: "numeric" })}</small>
        </div>
        <div class="row-right">
        <strong>${money(p.amount)}</strong>
        <small>${esc(p.payment_method.replace("_", " "))}</small>
        </div>
        </div>`;
            })
            .join("")
        : '<div class="list-empty">Recorded payments will appear here.</div>';
      $("overview-properties").innerHTML =
        state.properties
          .filter((p) => !p.archived_at)
          .slice(0, 3)
          .map((p) => propertyCard(p, true))
          .join("") ||
        '<div class="list-empty">Add your first property to build your portfolio.</div>';
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
    function propertyAddressCell(property, street) {
      const note = String(property.notes || "").trim();
      return `<td>
        <button class="table-action property-row-name" data-property-open="${esc(property.id)}">${esc(street)}${property.archived_at ? " · Archived" : ""}</button>
        <button type="button" class="property-row-note${note ? " has-note" : ""}" data-property-note="${esc(property.id)}" aria-label="${esc(note ? "Edit" : "Add")} quick note for ${esc(street)}" title="${esc(note || "Add a quick note")}">${note ? `<em>${esc(note)}</em>` : "<em>＋ Add note</em>"}</button>
        </td>`;
    }
    function accountPortfolioRowHTML({
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
    }) {
      const paymentClasses = {
        none: "payment-not-received-this-month",
        partial: "payment-received-this-month",
        full: "payment-paid-in-full-this-month",
      };
      const paymentTitles = {
        none: "No payment received this month",
        partial: "Partial payment received this month",
        full: "Full scheduled amount received this month",
      };
      const paymentAmount =
        account.payment_frequency === "monthly"
          ? money(account.payment_amount)
          : `≈ ${money(monthly)}`;
      const frequencyHint =
        account.payment_frequency === "monthly"
          ? "Monthly"
          : `${money(account.payment_amount)} / ${paymentFrequencyLabel(account.payment_frequency).toLowerCase()}`;
      const inactiveHint =
        (account.status || "active") !== "active" ? " · Inactive" : "";

      return `<tr>
        <td class="${paymentClasses[paymentStatus]}" title="${paymentTitles[paymentStatus]}">
        <button type="button" class="button primary compact" data-account-payment="${esc(account.id)}">＋ Payment</button>
        </td>
        <td class="portfolio-due">${money(due)}</td>
        ${propertyAddressCell(property, street)}
        <td>
        <a class="table-action" href="${esc(reminderHref)}" title="${esc(recipientHint)}" aria-label="${esc(`Draft late reminder email for ${partyName}`)}">${esc(partyName)}</a>
        <small class="table-subtext">${esc(account.name)}${inactiveHint}</small>
        </td>
        <td>${paymentAmount}<small class="table-subtext">${frequencyHint}</small>
        </td>
        <td>${account.account_type === "rental" ? "—" : money(loanBalance)}</td>
      </tr>`;
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
              unpaidDueAccrualStart(account),
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
              html: accountPortfolioRowHTML({
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
            html: `<tr>
        <td>
        <button type="button" class="button secondary compact" data-property-account="${esc(property.id)}">＋ Add account</button>
        </td>
        <td class="portfolio-due">—</td>${propertyAddressCell(property, street)}<td colspan="2" class="muted">No rental or contract recorded</td>
        <td>—</td>
        </tr>`,
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
      const loanBalanceTotal = totals.loanCount
        ? money(totals.loanBalance)
        : "—";
      $("accounts-totals").innerHTML = `<tr>
        <td>
        </td>
        <td class="portfolio-due">
        <strong>${money(totals.unpaidDue)}</strong>
        </td>
        <td>
        </td>
        <td>
        <strong>Visible totals</strong>
        </td>
        <td>
        <strong>${money(totals.scheduledPayment)}<small class="table-subtext">per month</small>
        </strong>
        </td>
        <td>
        <strong>${loanBalanceTotal}</strong>
        </td>
        </tr>`;
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
      updateGreeting,
      propertyCard,
      renderOverview,
      renderProperties,
      attachEvents,
      propertyAddressCell,
      renderAccounts,
    };
  }

  window.PropertyDeskPropertyViews = Object.freeze({
    create: createPropertyViews,
  });
})();
