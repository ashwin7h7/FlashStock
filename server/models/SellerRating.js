import mongoose from "mongoose";

const sellerRatingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
    pickupId: { type: mongoose.Schema.Types.ObjectId, ref: "pickup", required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

sellerRatingSchema.index({ sellerId: 1, createdAt: -1 });
sellerRatingSchema.index({ buyerId: 1, createdAt: -1 });
sellerRatingSchema.index({ buyerId: 1, auctionId: 1 }, { unique: true });

const SellerRating = mongoose.models.sellerRating || mongoose.model("sellerRating", sellerRatingSchema);

export default SellerRating;
