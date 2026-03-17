const ROLE_BUYER = "buyer";
const ROLE_SELLER = "seller";

export const getNotificationAudience = (notification) => {
  const type = notification?.type || "";
  const title = (notification?.title || "").toLowerCase();
  const message = (notification?.message || "").toLowerCase();

  if (type === "pickup_ready") return ROLE_BUYER;
  if (type === "negotiation_accepted") return ROLE_BUYER;
  if (type === "negotiation_rejected") return ROLE_BUYER;

  if (type === "negotiation_started") return ROLE_SELLER;

  if (type === "pickup_completed") {
    if (message.includes("you have confirmed the pickup")) return ROLE_BUYER;
    if (message.includes("buyer has confirmed the pickup")) return ROLE_SELLER;
    return "both";
  }

  if (type === "negotiation_sale_closed") {
    if (title.includes("product sold by negotiation")) return ROLE_SELLER;
    if (title.includes("you secured the product by negotiation")) return ROLE_BUYER;
    return "both";
  }

  return "both";
};

export const filterNotificationsByRole = (notifications, role) => {
  if (!Array.isArray(notifications)) return [];
  if (!role) return notifications;

  return notifications.filter((notification) => {
    const audience = getNotificationAudience(notification);
    return audience === "both" || audience === role;
  });
};

export const isBuyerNotification = (notification) => {
  const audience = getNotificationAudience(notification);
  return audience === ROLE_BUYER || audience === "both";
};

export const isSellerNotification = (notification) => {
  const audience = getNotificationAudience(notification);
  return audience === ROLE_SELLER || audience === "both";
};
