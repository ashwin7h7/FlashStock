import express from "express";
import { addProduct, getSellerProducts } from "../controllers/productController.js";
import authSeller from "../middlewares/authSeller.js";

const router = express.Router();

// Add product (seller only)
router.post("/add", authSeller, addProduct);

// Get seller's own products
router.get("/my-products", authSeller, getSellerProducts);

export default router;