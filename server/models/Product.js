import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: { type: Array, required: true },      
    category: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

    // Auction fields
    isAuction: { type: Boolean, default: false },           // true if auction started
    auctionStatus: { type: String, enum: ["active", "ended"], default: "active" },
    startingBid: { type: Number },                          // minimum allowed first bid
    auctionEndTime: { type: Date },                         // when auction ends
    highestBidderId: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // current highest bidder
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "user" }         // winner after auction ends
  },
  { timestamps: true }
);

const Product = mongoose.models.product || mongoose.model("product", productSchema);

export default Product;