import Order from "../models/Order.js";
import Pickup from "../models/Pickup.js";

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .populate("productId")
      .sort({ purchasedAt: -1 });

    // Attach pickup status for each order
    const orderIds = orders.map((o) => o._id);
    const pickups = await Pickup.find({ orderId: { $in: orderIds } }).lean();
    const pickupMap = {};
    for (const p of pickups) {
      pickupMap[p.orderId.toString()] = {
        pickupId: p._id,
        pickupStatus: p.status,
        sellerConfirmed: p.sellerConfirmed,
        buyerConfirmed: p.buyerConfirmed,
      };
    }

    const enriched = orders.map((o) => {
      const obj = o.toObject();
      obj.pickup = pickupMap[o._id.toString()] || null;
      return obj;
    });

    res.json({ success: true, orders: enriched });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};