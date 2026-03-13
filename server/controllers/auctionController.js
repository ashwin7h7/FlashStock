import mongoose from "mongoose";
import Product from "../models/Product.js";
import Bid from "../models/Bid.js";
import Pickup from "../models/Pickup.js";

// Start Auction
// http://localhost:4000/api/auction/start
export const startAuction = async (req, res) => {
  try {
    const { productId, startingBid, endTime } = req.body;

    // Validate required fields
    if (!productId || startingBid == null || !endTime) {
      return res.status(400).json({ success: false, message: "productId, startingBid, and endTime are required" });
    }

    if (typeof startingBid !== "number" || startingBid <= 0) {
      return res.status(400).json({ success: false, message: "startingBid must be a positive number" });
    }

    const endDate = new Date(endTime);
    if (isNaN(endDate.getTime()) || endDate <= new Date()) {
      return res.status(400).json({ success: false, message: "endTime must be a valid future date" });
    }

    // Verify product exists and belongs to this seller
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.sellerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only auction your own products" });
    }

    // Block if auction is currently active
    if (product.isAuction && product.auctionStatus === "active") {
      return res.status(400).json({ success: false, message: "Auction already active for this product" });
    }

    // Block restart if auction ended with a winner
    if (product.winnerId) {
      return res.status(400).json({ success: false, message: "Cannot restart — auction ended with a winner" });
    }

    // Block restart if pickup exists and is completed
    if (product.isAuction) {
      const completedPickup = await Pickup.findOne({ productId: productId, status: { $in: ["completed", "COMPLETED"] } });
      if (completedPickup) {
        return res.status(400).json({ success: false, message: "Cannot restart — pickup already completed" });
      }
    }

    // Set auction fields — treat every start/restart as a fresh round
    product.isAuction = true;
    product.auctionStatus = "active";
    product.startingBid = startingBid;
    product.offerPrice = startingBid;
    product.auctionEndTime = endDate;
    product.auctionStartedAt = new Date();
    product.highestBidderId = null;
    product.winnerId = null;
    await product.save();

    res.json({
      success: true,
      message: "Auction started",
      product
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Active Auctions
// http://localhost:4000/api/auction/active
export const getActiveAuctions = async (req, res) => {
  try {
    const { location, category, search, sortBy } = req.query;
    const filter = {
      isAuction: true,
      auctionStatus: "active",
      auctionEndTime: { $gt: new Date() },
    };

    if (location && location.toLowerCase() !== "all") {
      filter.location = location;
    }

    if (category && category.toLowerCase() !== "all") {
      filter.category = category;
    }

    if (search && search.trim()) {
      const safeSearch = search.trim();
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const sort = {};
    if (sortBy === "highest-bid") {
      sort.offerPrice = -1;
    } else if (sortBy === "recently-added") {
      sort.createdAt = -1;
    } else {
      // default and "ending-soon"
      sort.auctionEndTime = 1;
    }

    const auctions = await Product.find(filter).sort(sort);

    res.json({
      success: true,
      auctions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Ended Auctions (with results)
// GET /api/auction/ended
export const getEndedAuctions = async (req, res) => {
  try {
    const auctions = await Product.find({
      isAuction: true,
      auctionStatus: { $in: ["ended", "closed_by_negotiation"] }
    })
      .populate("winnerId", "name email")
      .populate("sellerId", "name")
      .sort({ auctionEndTime: -1 });

    res.json({ success: true, auctions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get auctions where the current user has placed bids
// GET /api/auction/my-bids
export const getMyBids = async (req, res) => {
  try {
    // Find distinct product IDs the user has bid on
    const productIds = await Bid.distinct("productId", { bidderId: req.userId });

    if (productIds.length === 0) {
      return res.json({ success: true, items: [] });
    }

    // Fetch those products
    const products = await Product.find({ _id: { $in: productIds } })
      .populate("sellerId", "name")
      .lean();

    // Build a map of auctionStartedAt per product for round filtering
    const startMap = {};
    for (const p of products) {
      if (p.auctionStartedAt) startMap[p._id.toString()] = p.auctionStartedAt;
    }

    // For each product, get the user's highest bid in the CURRENT round only
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Build per-product match conditions that respect round boundaries
    const matchConditions = productIds.map((pid) => {
      const cond = { bidderId: userId, productId: pid };
      if (startMap[pid.toString()]) {
        cond.createdAt = { $gte: startMap[pid.toString()] };
      }
      return cond;
    });

    const userBids = await Bid.aggregate([
      { $match: { $or: matchConditions } },
      { $group: { _id: "$productId", myHighestBid: { $max: "$amount" }, lastBidAt: { $max: "$createdAt" } } }
    ]);

    const bidMap = {};
    for (const b of userBids) {
      bidMap[b._id.toString()] = { myHighestBid: b.myHighestBid, lastBidAt: b.lastBidAt };
    }

    const items = products.map((p) => ({
      ...p,
      myHighestBid: bidMap[p._id.toString()]?.myHighestBid || 0,
      lastBidAt: bidMap[p._id.toString()]?.lastBidAt || null,
    }));

    // Sort by most recent bid first
    items.sort((a, b) => new Date(b.lastBidAt) - new Date(a.lastBidAt));

    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Bid History for a product/auction
// GET /api/auction/:productId/bids
export const getBidHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    // Only return bids from the current auction round
    const product = await Product.findById(productId).select("auctionStartedAt");
    const filter = { productId };
    if (product?.auctionStartedAt) {
      filter.createdAt = { $gte: product.auctionStartedAt };
    }

    const bids = await Bid.find(filter)
      .sort({ createdAt: -1 })
      .populate("bidderId", "name");

    res.json({ success: true, bids });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
