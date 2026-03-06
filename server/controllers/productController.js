import Product from "../models/Product.js";

// Add Product (Seller only)
export const addProduct = async (req, res) => {
  try {
    const { name, description, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: "Name and price are required" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      sellerId: req.userId  // seller's ID from authSeller middleware
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all products for a seller
export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.userId });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};