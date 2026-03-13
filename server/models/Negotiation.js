import mongoose from "mongoose";

const negotiationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "accepted", "rejected", "closed"],
      default: "open",
    },
    acceptedOfferAmount: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate open threads for the same buyer + product combo
negotiationSchema.index({ productId: 1, buyerId: 1, status: 1 });

const Negotiation =
  mongoose.models.negotiation ||
  mongoose.model("negotiation", negotiationSchema);

export default Negotiation;
