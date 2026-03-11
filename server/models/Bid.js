import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Bid = mongoose.models.bid || mongoose.model("bid", bidSchema);

export default Bid;
