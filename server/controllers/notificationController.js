import Notification from "../models/Notification.js";
import Product from "../models/Product.js";

const ROLE_BUYER = "buyer";
const ROLE_SELLER = "seller";

const getRoleFromQuery = (req) => {
  const role = req.query?.role;
  if (role === ROLE_BUYER || role === ROLE_SELLER) return role;
  return null;
};

const isValidRoleParam = (req) => {
  const role = req.query?.role;
  return role === undefined || role === ROLE_BUYER || role === ROLE_SELLER;
};

const ROLE_BY_TYPE = {
  pickup_ready_buyer: ROLE_BUYER,
  pickup_completed_buyer: ROLE_BUYER,
  pickup_completed_seller: ROLE_SELLER,
  negotiation_started_seller: ROLE_SELLER,
  negotiation_offer_buyer: ROLE_BUYER,
  negotiation_offer_seller: ROLE_SELLER,
  negotiation_message_buyer: ROLE_BUYER,
  negotiation_message_seller: ROLE_SELLER,
  negotiation_accepted_buyer: ROLE_BUYER,
  negotiation_accepted_seller: ROLE_SELLER,
  negotiation_rejected_buyer: ROLE_BUYER,
  negotiation_rejected_seller: ROLE_SELLER,
  negotiation_sale_closed_buyer: ROLE_BUYER,
  negotiation_sale_closed_seller: ROLE_SELLER,
  // Legacy type support
  pickup_ready: ROLE_BUYER,
  negotiation_started: ROLE_SELLER,
};

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const buildSellerByProductMap = async (notifications) => {
  const relatedProductIds = [...new Set(
    notifications
      .map((notification) => toIdString(notification?.relatedProductId))
      .filter(Boolean)
  )];

  if (relatedProductIds.length === 0) return new Map();

  const products = await Product.find({ _id: { $in: relatedProductIds } })
    .select("_id sellerId")
    .lean();

  return new Map(products.map((product) => [String(product._id), String(product.sellerId)]));
};

const getRoleFromOwnership = (notification, sellerByProductId) => {
  const productId = toIdString(notification?.relatedProductId);
  if (!productId) return null;

  const sellerId = sellerByProductId.get(productId);
  if (!sellerId) return null;

  return toIdString(notification?.userId) === sellerId ? ROLE_SELLER : ROLE_BUYER;
};

const getNotificationRole = (notification, sellerByProductId) => {
  const type = notification?.type || "";

  if (ROLE_BY_TYPE[type]) return ROLE_BY_TYPE[type];

  // Legacy ambiguous types resolved by product ownership context
  if (
    type === "pickup_completed" ||
    type === "negotiation_offer" ||
    type === "negotiation_message" ||
    type === "negotiation_accepted" ||
    type === "negotiation_rejected" ||
    type === "negotiation_sale_closed"
  ) {
    const roleFromOwnership = getRoleFromOwnership(notification, sellerByProductId);
    if (roleFromOwnership) return roleFromOwnership;
  }

  // Unknown types are excluded from role-scoped responses to avoid leakage.
  return null;
};

const filterByRole = async (notifications, role) => {
  if (!role) return notifications;

  const sellerByProductId = await buildSellerByProductMap(notifications);
  return notifications.filter((notification) => getNotificationRole(notification, sellerByProductId) === role);
};

// GET /api/notifications/count/unread
export const getUnreadCount = async (req, res) => {
  try {
    if (!isValidRoleParam(req)) {
      return res.status(400).json({ success: false, message: "Invalid role. Use role=buyer or role=seller" });
    }

    const role = getRoleFromQuery(req);
    const unreadNotifications = await Notification.find({ userId: req.userId, isRead: false });
    const count = (await filterByRole(unreadNotifications, role)).length;

    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/notifications
export const getMyNotifications = async (req, res) => {
  try {
    if (!isValidRoleParam(req)) {
      return res.status(400).json({ success: false, message: "Invalid role. Use role=buyer or role=seller" });
    }

    const role = getRoleFromQuery(req);
    const allNotifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate("relatedProductId", "name image");

    const notifications = await filterByRole(allNotifications, role);

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read
export const markNotificationAsRead = async (req, res) => {
  try {
    if (!isValidRoleParam(req)) {
      return res.status(400).json({ success: false, message: "Invalid role. Use role=buyer or role=seller" });
    }

    const role = getRoleFromQuery(req);
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.userId });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (role) {
      const sellerByProductId = await buildSellerByProductMap([notification]);
      const notificationRole = getNotificationRole(notification, sellerByProductId);
      if (notificationRole !== role) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/read-all
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    if (!isValidRoleParam(req)) {
      return res.status(400).json({ success: false, message: "Invalid role. Use role=buyer or role=seller" });
    }

    const role = getRoleFromQuery(req);
    const unreadNotifications = await Notification.find({ userId: req.userId, isRead: false }).select("_id userId type title message relatedProductId");
    const scopedNotifications = await filterByRole(unreadNotifications, role);

    if (scopedNotifications.length > 0) {
      await Notification.updateMany(
        { _id: { $in: scopedNotifications.map((notification) => notification._id) } },
        { isRead: true }
      );
    }

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
