import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    default: "completed"
  },

  purchasedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;