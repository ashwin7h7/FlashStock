import Product from "../models/Product.js";
import Bid from "../models/Bid.js";

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
    if (product.isAuction) {
      return res.status(400).json({ success: false, message: "Auction already active for this product" });
    }

    // Set auction fields
    product.isAuction = true;
    product.auctionStatus = "active";
    product.startingBid = startingBid;
    // Only initialize offerPrice from startingBid if it's not already higher
    product.offerPrice = Math.max(startingBid, product.offerPrice || 0);
    product.auctionEndTime = endDate;
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
    const auctions = await Product.find({
      isAuction: true,
      auctionStatus: "active",
      auctionEndTime: { $gt: new Date() }
    });

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
      auctionStatus: "ended"
    })
      .populate("winnerId", "name email")
      .populate("sellerId", "name")
      .sort({ auctionEndTime: -1 });

    res.json({ success: true, auctions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Bid History for a product/auction
// GET /api/auction/:productId/bids
export const getBidHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    const bids = await Bid.find({ productId })
      .sort({ createdAt: -1 })
      .populate("bidderId", "name");

    res.json({ success: true, bids });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
