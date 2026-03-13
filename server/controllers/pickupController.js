import Pickup from "../models/Pickup.js";
import Notification from "../models/Notification.js";

// GET /api/pickups
export const getMyPickups = async (req, res) => {
  try {
    const pickups = await Pickup.find({
      $or: [{ sellerId: req.userId }, { buyerId: req.userId }]
    })
      .populate("productId", "name image offerPrice location")
      .populate("sellerId", "name email phone location")
      .populate("buyerId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, pickups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/pickups/:id
export const getPickupById = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate("productId", "name image offerPrice location")
      .populate("sellerId", "name email phone location")
      .populate("buyerId", "name");

    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    // Only seller or buyer can view
    const userId = req.userId.toString();
    if (pickup.sellerId._id.toString() !== userId && pickup.buyerId._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to view this pickup" });
    }

    res.json({ success: true, pickup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/pickups/:id/confirm-seller  →  Seller marks item as ready for pickup
export const confirmPickupBySeller = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    if (pickup.sellerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the seller can perform this action" });
    }

    const alreadyPast = ["READY_FOR_PICKUP", "PICKUP_CONFIRMED", "COMPLETED", "completed"];
    if (alreadyPast.includes(pickup.status)) {
      return res.status(400).json({ success: false, message: "Item is already past this stage" });
    }

    pickup.status = "READY_FOR_PICKUP";
    pickup.sellerConfirmed = true;
    pickup.readyAt = new Date();

    await pickup.save();

    await Notification.create({
      userId: pickup.buyerId,
      type: "pickup_ready",
      title: "Item ready for pickup!",
      message: "The seller has marked your item as ready for pickup. Please confirm when you collect it.",
      relatedProductId: pickup.productId
    });

    res.json({ success: true, message: "Item marked as ready for pickup", pickup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/pickups/:id/confirm-buyer  →  Buyer confirms pickup; auto-completes transaction
export const confirmPickupByBuyer = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    if (pickup.buyerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the buyer can perform this action" });
    }

    if (pickup.status === "COMPLETED" || pickup.status === "completed") {
      return res.status(400).json({ success: false, message: "Pickup already completed" });
    }

    // Allow confirmation when READY_FOR_PICKUP, or legacy "pending" with sellerConfirmed
    const canConfirm =
      pickup.status === "READY_FOR_PICKUP" ||
      (pickup.status === "pending" && pickup.sellerConfirmed);

    if (!canConfirm) {
      return res.status(400).json({ success: false, message: "Waiting for the seller to mark the item as ready first" });
    }

    const now = new Date();
    pickup.buyerConfirmed = true;
    pickup.confirmedAt = now;
    pickup.status = "COMPLETED";
    pickup.completedAt = now;

    await pickup.save();

    await Notification.create({
      userId: pickup.buyerId,
      type: "pickup_completed",
      title: "Pickup completed!",
      message: "You have confirmed the pickup. Transaction is complete.",
      relatedProductId: pickup.productId
    });
    await Notification.create({
      userId: pickup.sellerId,
      type: "pickup_completed",
      title: "Pickup completed!",
      message: "The buyer has confirmed the pickup. Transaction is complete.",
      relatedProductId: pickup.productId
    });

    res.json({ success: true, message: "Pickup completed", pickup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
