/* PropertyDesk dashboard and overview views. */
(() => {
  "use strict";
  function createOverview(context) {
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
      openPropertyDetails,
      openPropertyPayment,
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
    function attachEvents() {
      $("overview-properties").addEventListener("click", (event) => {
        const payment = event.target.closest("[data-property-payment]");
        if (payment) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyPayment(payment.dataset.propertyPayment);
          return;
        }
        const card = event.target.closest("[data-property-card]");
        if (card) openPropertyDetails(card.dataset.propertyCard);
      });
    }

    return { updateGreeting, renderOverview, attachEvents };
  }
  window.PropertyDeskOverview = Object.freeze({ create: createOverview });
})();
