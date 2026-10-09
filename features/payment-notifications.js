/* Notify workspace members when another person records a payment. */
(() => {
  "use strict";

  function create({
    getWorkspaceIdentity,
    getPaymentNotificationData,
    getClient,
    toast,
    money,
    propertyAddress,
    refresh,
  }) {
    let channel = null;
    let channelClient = null;
    let channelKey = "";
    let connectionWarningShown = false;
    const seenPaymentIds = new Set();

    function stop() {
      if (channel && channelClient) {
        void channelClient.removeChannel(channel);
      }
      channel = null;
      channelClient = null;
      channelKey = "";
      connectionWarningShown = false;
    }

    function describePayment(payment) {
      const data = getPaymentNotificationData();
      const actor = data.members.find(
        (member) => member.member_user_id === payment.recorded_by,
      );
      const account = data.accounts.find(
        (item) => item.id === payment.account_id,
      );
      const property = data.properties.find(
        (item) => item.id === account?.property_id,
      );
      const name = actor?.display_name || actor?.email || "A workspace member";
      const address = property ? propertyAddress(property) : "a property";
      toast(
        `${name} recorded a payment of ${money(payment.amount)} for ${address}.`,
      );
    }

    function handlePaymentInsert(payload) {
      const payment = payload?.new;
      if (
        !payment?.id ||
        !payment.recorded_by ||
        payment.recorded_by === getWorkspaceIdentity().viewerId ||
        payment.status === "voided" ||
        seenPaymentIds.has(payment.id)
      ) {
        return;
      }
      seenPaymentIds.add(payment.id);
      if (seenPaymentIds.size > 100) {
        const oldestId = seenPaymentIds.values().next().value;
        seenPaymentIds.delete(oldestId);
      }
      describePayment(payment);
      void refresh().catch(() => {});
    }

    function start() {
      const client = getClient();
      const { ownerId, viewerId } = getWorkspaceIdentity();
      if (!client?.channel || !ownerId || !viewerId) return false;

      const nextKey = `${ownerId}:${viewerId}`;
      if (channel && channelKey === nextKey) return true;
      stop();

      channelClient = client;
      channelKey = nextKey;
      channel = client
        .channel(`pd-payment-notifications:${nextKey}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "pd_payments",
            filter: `user_id=eq.${ownerId}`,
          },
          handlePaymentInsert,
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            connectionWarningShown = false;
          } else if (
            (status === "CHANNEL_ERROR" || status === "TIMED_OUT") &&
            !connectionWarningShown
          ) {
            connectionWarningShown = true;
            toast("Live payment notifications are temporarily unavailable.");
          }
        });
      return true;
    }

    return Object.freeze({ start, stop });
  }

  window.PropertyDeskPaymentNotifications = Object.freeze({ create });
})();
