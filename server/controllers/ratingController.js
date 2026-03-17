import Pickup from "../models/Pickup.js";
import SellerRating from "../models/SellerRating.js";
import mongoose from "mongoose";

const COMPLETED_STATUSES = ["COMPLETED", "completed"];

const parseRating = (value) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num;
};

// POST /api/ratings
export const submitSellerRating = async (req, res) => {
  try {
    const { pickupId, rating, comment } = req.body;

    if (!pickupId) {
      return res.status(400).json({ success: false, message: "pickupId is required" });
    }

    const safeRating = parseRating(rating);
    if (!safeRating) {
      return res.status(400).json({ success: false, message: "rating must be an integer between 1 and 5" });
    }

    const pickup = await Pickup.findById(pickupId).select("buyerId sellerId productId status");
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    if (pickup.buyerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the winning buyer can rate this seller" });
    }

    const isSelfRating =
      pickup.buyerId.toString() === pickup.sellerId.toString() ||
      pickup.sellerId.toString() === req.userId.toString();

    if (isSelfRating) {
      return res.status(400).json({ success: false, message: "You cannot rate your own account." });
    }

    if (!COMPLETED_STATUSES.includes(pickup.status)) {
      return res.status(400).json({ success: false, message: "You can rate the seller only after pickup is completed" });
    }

    const existing = await SellerRating.findOne({ pickupId });
    if (existing) {
      return res.status(409).json({ success: false, message: "You already submitted a rating for this transaction" });
    }

    const doc = await SellerRating.create({
      sellerId: pickup.sellerId,
      buyerId: pickup.buyerId,
      auctionId: pickup.productId,
      pickupId: pickup._id,
      rating: safeRating,
      comment: (comment || "").trim(),
    });

    return res.status(201).json({ success: true, message: "Thank you for your feedback", rating: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You already submitted a rating for this transaction" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ratings/seller/:sellerId
export const getSellerRatingSummary = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ success: false, message: "Invalid seller id" });
    }

    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const [summary] = await SellerRating.aggregate([
      { $match: { sellerId: sellerObjectId } },
      {
        $group: {
          _id: "$sellerId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const recentReviews = await SellerRating.find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("buyerId", "name")
      .select("rating comment createdAt buyerId");

    return res.json({
      success: true,
      summary: {
        avgRating: summary ? Number(summary.avgRating.toFixed(1)) : 0,
        totalReviews: summary?.totalReviews || 0,
      },
      recentReviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ratings/mine
export const getMySubmittedRatings = async (req, res) => {
  try {
    const ratings = await SellerRating.find({ buyerId: req.userId })
      .select("pickupId auctionId sellerId rating comment createdAt")
      .sort({ createdAt: -1 });

    return res.json({ success: true, ratings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
