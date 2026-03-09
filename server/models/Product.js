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
    auctionEndTime: { type: Date },                         // when auction ends
    highestBidderId: { type: mongoose.Schema.Types.ObjectId, ref: "user" } // current highest bidder
  },
  { timestamps: true }
);

const Product = mongoose.models.product || mongoose.model("product", productSchema);

export default Product;