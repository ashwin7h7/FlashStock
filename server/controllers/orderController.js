import Order from "../models/Order.js";
import Pickup from "../models/Pickup.js";

const buildPickupMap = (pickups) => {
  const pickupMap = {};
  for (const pickup of pickups) {
    pickupMap[pickup.orderId.toString()] = {
      pickupId: pickup._id,
      pickupStatus: pickup.status,
      sellerConfirmed: pickup.sellerConfirmed,
      buyerConfirmed: pickup.buyerConfirmed,
      completedAt: pickup.completedAt,
      sellerId: pickup.sellerId,
      buyerId: pickup.buyerId,
    };
  }
  return pickupMap;
};

const enrichOrdersWithPickup = async (orders) => {
  const orderIds = orders.map((order) => order._id);
  const pickups = await Pickup.find({ orderId: { $in: orderIds } })
    .populate("sellerId", "name")
    .populate("buyerId", "name")
    .lean();

  const pickupMap = buildPickupMap(pickups);

  return orders.map((order) => {
    const obj = order.toObject();
    obj.pickup = pickupMap[order._id.toString()] || null;
    return obj;
  });
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .populate({
        path: "productId",
        populate: { path: "sellerId", select: "name email phone location" },
      })
      .sort({ purchasedAt: -1 });

    const enriched = await enrichOrdersWithPickup(orders);

    res.json({ success: true, orders: enriched });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUserOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.userId }).populate({
      path: "productId",
      populate: { path: "sellerId", select: "name email phone location" },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Won item not found" });
    }

    const [enriched] = await enrichOrdersWithPickup([order]);

    res.json({ success: true, order: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};