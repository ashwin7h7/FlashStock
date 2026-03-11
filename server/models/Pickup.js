import mongoose from "mongoose";

const pickupSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "order" },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  sellerConfirmed: { type: Boolean, default: false },
  buyerConfirmed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Pickup = mongoose.models.pickup || mongoose.model("pickup", pickupSchema);

export default Pickup;
