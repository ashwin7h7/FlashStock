import Product from "../models/Product.js";
import { v2 as cloudinary } from "cloudinary";

// Add Product - seller only
//http://localhost:4000/api/product/add
export const addProduct = async (req, res) => {
  try {
    // Ensure sellerId from authSeller middleware
    const sellerId = req.userId;

    // Parse product data
    if (!req.body.productData) {
      return res.status(400).json({ success: false, message: "Missing product data" });
    }

    const productData = JSON.parse(req.body.productData);

    // Validate required fields
    const { name, description, price, category, offerPrice } = productData;
    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Upload images
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }

    const imagesUrl = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { resource_type: "image" });
        return result.secure_url;
      })
    );

    // Create product with sellerId
    const product = await Product.create({
      ...productData,
      image: imagesUrl,
      sellerId
    });

    res.status(201).json({ success: true, message: "Product added", product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all products for a seller
//http://localhost:4000/api/product/my-products
export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.userId });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};