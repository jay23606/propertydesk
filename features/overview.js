/* Write dashboard summary data and rendered rows into the page. */
(() => {
  "use strict";

  function createOverview({ $, money, overviewModel, overviewView }) {
    function renderOverview() {
      const summary = overviewModel.buildOverview();
      $("stat-properties").textContent = summary.propertyCount;
      $("stat-accounts").textContent = summary.accountCount;
      $("stat-collected").textContent = money(summary.collected);
      $("stat-expected").textContent = money(summary.expected);
      $("stat-collected-foot").textContent =
        `${summary.recordedPaymentCount} payment${summary.recordedPaymentCount === 1 ? "" : "s"} recorded`;
      $("upcoming-list").innerHTML = summary.upcoming.length
        ? summary.upcoming.map(overviewView.upcomingPaymentRow).join("")
        : '<div class="list-empty">No upcoming payments yet. Add an account to get started.</div>';
      $("activity-list").innerHTML = summary.recent.length
        ? summary.recent.map(overviewView.recentPaymentRow).join("")
        : '<div class="list-empty">Recorded payments will appear here.</div>';
      $("overview-properties").innerHTML =
        summary.propertyCards.map(overviewView.propertyCard).join("") ||
        '<div class="list-empty">Add your first property to build your portfolio.</div>';
    }

    return Object.freeze({ renderOverview });
  }

  window.PropertyDeskOverview = Object.freeze({ create: createOverview });
})();
