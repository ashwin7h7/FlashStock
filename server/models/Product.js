import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },  // simpler and searchable
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: { type: Array, required: true },      // array of image URLs
    category: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
  },
  { timestamps: true }
);

const Product = mongoose.models.product || mongoose.model("product", productSchema);

export default Product;