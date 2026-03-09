import Product from "../models/Product.js";

// Start Auction
// http://localhost:4000/api/auction/start
// Start Auction
export const startAuction = async (req, res) => {
  try {
    const { productId, startingBid, endTime } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        offerPrice: startingBid,
        auctionEndTime: endTime,
        isAuction: true
      },
      { new: true } // return the updated document
    );

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

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
// http://localhost:4000/api/auction/active
export const getActiveAuctions = async (req, res) => {
  try {
    const auctions = await Product.find({
      isAuction: true,
    });

    res.json({
      success: true,
      auctions,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
