import Product from "../models/Product.js";

// Start Auction
export const startAuction = async (req, res) => {
  try {

    const { productId, startingBid, endTime } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    product.offerPrice = startingBid;
    product.auctionEndTime = endTime;
    product.isAuction = true;

    await product.save();

    res.json({
      success: true,
      message: "Auction started",
      product
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Active Auctions
export const getActiveAuctions = async (req, res) => {
  try {

    const auctions = await Product.find({
      isAuction: true
    });

    res.json({
      success: true,
      auctions
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};