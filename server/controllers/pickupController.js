import Pickup from "../models/Pickup.js";
import Notification from "../models/Notification.js";

// GET /api/pickups
export const getMyPickups = async (req, res) => {
  try {
    const pickups = await Pickup.find({
      $or: [{ sellerId: req.userId }, { buyerId: req.userId }]
    })
      .populate("productId", "name image offerPrice")
      .populate("sellerId", "name")
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
      .populate("productId", "name image offerPrice")
      .populate("sellerId", "name")
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

// PATCH /api/pickups/:id/confirm-seller
export const confirmPickupBySeller = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    if (pickup.sellerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the seller can confirm as seller" });
    }

    if (pickup.status === "completed") {
      return res.status(400).json({ success: false, message: "Pickup already completed" });
    }

    pickup.sellerConfirmed = true;

    // Check if both confirmed
    if (pickup.sellerConfirmed && pickup.buyerConfirmed) {
      pickup.status = "completed";
      pickup.completedAt = new Date();

      // Notify both parties
      await Notification.create({
        userId: pickup.buyerId,
        type: "pickup_completed",
        title: "Pickup completed!",
        message: "Both parties have confirmed the pickup. Transaction is complete.",
        relatedProductId: pickup.productId
      });
      await Notification.create({
        userId: pickup.sellerId,
        type: "pickup_completed",
        title: "Pickup completed!",
        message: "Both parties have confirmed the pickup. Transaction is complete.",
        relatedProductId: pickup.productId
      });
    }

    await pickup.save();

    res.json({ success: true, message: pickup.status === "completed" ? "Pickup completed" : "Seller confirmed", pickup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/pickups/:id/confirm-buyer
export const confirmPickupByBuyer = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    if (pickup.buyerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the buyer can confirm as buyer" });
    }

    if (pickup.status === "completed") {
      return res.status(400).json({ success: false, message: "Pickup already completed" });
    }

    pickup.buyerConfirmed = true;

    // Check if both confirmed
    if (pickup.sellerConfirmed && pickup.buyerConfirmed) {
      pickup.status = "completed";
      pickup.completedAt = new Date();

      await Notification.create({
        userId: pickup.buyerId,
        type: "pickup_completed",
        title: "Pickup completed!",
        message: "Both parties have confirmed the pickup. Transaction is complete.",
        relatedProductId: pickup.productId
      });
      await Notification.create({
        userId: pickup.sellerId,
        type: "pickup_completed",
        title: "Pickup completed!",
        message: "Both parties have confirmed the pickup. Transaction is complete.",
        relatedProductId: pickup.productId
      });
    }

    await pickup.save();

    res.json({ success: true, message: pickup.status === "completed" ? "Pickup completed" : "Buyer confirmed", pickup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
